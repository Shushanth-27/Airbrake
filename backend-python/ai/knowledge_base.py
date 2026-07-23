"""Knowledge base helpers — solution versioning, metrics, and Bedrock embeddings.

Architecture
────────────
Duplicate detection order (cheapest first):
  1. Exact-text normalization  — pure Python + one SQL query, zero Bedrock cost
  2. Semantic similarity        — Bedrock embedding + Pinecone query
  3. LLM confirmation           — Nova Lite, only at the 0.90–0.95 boundary

Atomic operations
  increment_usage() uses a single UPDATE SET usage_count = usage_count + 1
  to eliminate the read-then-write race condition under concurrent load.
  Version assignment uses COALESCE(MAX(version),0)+1 with a retry loop
  (MAX_VERSION_RETRIES) to handle serialization conflicts from Aurora DSQL's
  optimistic concurrency.

Storage
  No knowledge_id column.  Duplicate detection redirects to the existing row
  so no fragmentation occurs when working correctly.  Metrics (usage_count,
  confidence_score) are per-row — no separate aggregation table needed.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from ai.error_matching import build_error_hash_candidates, normalize_project_name
from ai.pinecone_service import delete_vector, query_similar, upsert_vector
from db import execute, execute_returning, query

logger = logging.getLogger(__name__)

TABLE = "projects_data"
MAX_VERSION_RETRIES = 5


# ── Internal helpers ──────────────────────────────────────────────────────────

def _create_embedding_safe(text: str) -> Optional[str]:
    """Generate a Titan embedding, returning it as a JSON string for the TEXT column.
    Returns None (not raises) on any failure so saves always succeed without embeddings.
    """
    try:
        from ai.embeddings import create_embedding
        vec = create_embedding(text)
        if vec and any(v != 0.0 for v in vec):
            return json.dumps(vec)
        logger.warning("[KnowledgeBase] Bedrock returned zero vector — embedding skipped")
        return None
    except Exception as exc:
        logger.exception(
            "[KnowledgeBase] Embedding generation failed — solution saved without embedding: %s", exc
        )
        return None


def calculate_confidence(usage_count: int) -> float:
    return round(min(100.0, 50.0 + float(usage_count) * 2.0), 2)


def classify_duplicate_solution(
    similarity: Optional[float],
    confirmation: Optional[bool] = None,
) -> Dict[str, Any]:
    """Return a structured decision dict for a given Pinecone similarity score."""
    if similarity is None:
        return {"is_duplicate": False, "decision": "new",       "severity": "none",   "confidence": 0.0}
    if similarity >= 0.95:
        return {"is_duplicate": True,  "decision": "duplicate", "severity": "high",   "confidence": float(similarity)}
    if similarity >= 0.90:
        return {"is_duplicate": False, "decision": "warn",      "severity": "medium", "confidence": float(similarity)}
    return     {"is_duplicate": False, "decision": "new",       "severity": "low",    "confidence": float(similarity)}


def _normalize_solution_text(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


# ── Tier 1: Exact-text duplicate search (no Bedrock call) ────────────────────

def _find_duplicate_solution(
    log_ref_id: str,
    solution_text: str,
    project_name: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Exact-text duplicate search — zero Bedrock cost.

    Pass 1: same log_ref_id (same error occurrence, fastest path).
    Pass 2: project-wide scan across all log_ref_id values — only when
            project_name is provided, to catch identical text saved under a
            different error hash without crossing project boundaries.
    """
    normalized = _normalize_solution_text(solution_text)
    if not normalized:
        return None

    # Pass 1 ──────────────────────────────────────────────────────────────────
    try:
        same_log_rows = query(
            f"SELECT id, usage_count, confidence_score, version, solution, "
            f"created_by, created_at "
            f"FROM {TABLE} "
            f"WHERE row_type = 'solution' AND log_ref_id = %s "
            f"ORDER BY created_at DESC",
            (log_ref_id,),
        )
        for row in same_log_rows:
            if _normalize_solution_text(row.get("solution")) == normalized:
                return row
    except Exception as exc:
        logger.exception(
            "[KnowledgeBase] Exact duplicate pass-1 query failed: %s", exc
        )
        return None

    # Pass 2: project-wide cross-hash scan ────────────────────────────────────
    if not project_name:
        return None

    try:
        project_rows = query(
            f"SELECT id, usage_count, confidence_score, version, solution, "
            f"created_by, created_at "
            f"FROM {TABLE} "
            f"WHERE row_type = 'solution' "
            f"AND LOWER(project_name) = LOWER(%s) "
            f"AND log_ref_id != %s "
            f"ORDER BY confidence_score DESC, usage_count DESC, created_at DESC "
            f"LIMIT 500",
            (project_name, log_ref_id),
        )
        for row in project_rows:
            if _normalize_solution_text(row.get("solution")) == normalized:
                logger.info(
                    "[KnowledgeBase] Cross-hash exact duplicate found — "
                    "solution_id=%s project=%r", row.get("id"), project_name
                )
                return row
    except Exception as exc:
        logger.exception(
            "[KnowledgeBase] Exact duplicate pass-2 query failed: %s", exc
        )

    return None


# ── Tier 2: Semantic duplicate search (Bedrock + Pinecone) ───────────────────

def detect_duplicate_solution(
    solution_text: str,
    error_hash: str,
    project_name: Optional[str] = None,
    limit: int = 5,
) -> Dict[str, Any]:
    """Project-scoped semantic duplicate detection.

    Only called after exact-text (Tier 1) found nothing.
    Pinecone is queried with project_name filter only (no error_hash) so
    semantically equivalent solutions under different hashes are caught.

    Thresholds:
      >= 0.95         → duplicate, no LLM needed
      0.90 – 0.95     → warn, ask Nova Lite for confirmation
      < 0.90          → new

    Fails open: any exception returns is_duplicate=False so saves are never
    silently blocked.
    """
    try:
        from ai.embeddings import create_embedding

        embedding = create_embedding(solution_text)
        if not embedding:
            logger.warning("[KnowledgeBase] Duplicate detection skipped — embedding unavailable")
            return {"is_duplicate": False, "decision": "new",
                    "reason": "embedding_unavailable", "duplicate_prompt": False}

        matches = query_similar(None, embedding, project_name, limit=limit, error_hash=None)
        if not matches:
            return {"is_duplicate": False, "decision": "new",
                    "reason": "no_matches", "duplicate_prompt": False}

        candidate       = None
        best_similarity = 0.0
        for match in matches:
            metadata   = match.get("metadata") or {}
            if not metadata.get("solution_id"):
                continue
            similarity = max(float(match.get("score") or 0.0), 0.0)
            if similarity > best_similarity:
                best_similarity = similarity
                candidate = match

        if not candidate:
            return {"is_duplicate": False, "decision": "new",
                    "reason": "no_valid_candidate", "duplicate_prompt": False}

        existing_solution = _get_solution_metadata(candidate.get("id"))
        if not existing_solution and candidate.get("metadata"):
            meta = candidate.get("metadata", {})
            existing_solution = {
                "id":               candidate.get("id"),
                "solution":         meta.get("solution"),
                "created_by":       meta.get("created_by"),
                "created_at":       meta.get("created_at"),
                "version":          meta.get("version"),
                "confidence_score": meta.get("confidence_score"),
                "usage_count":      meta.get("usage_count"),
            }

        classification = classify_duplicate_solution(best_similarity)

        # Tier 3: LLM confirmation at the 0.90–0.95 boundary
        if classification["decision"] == "warn":
            try:
                from ai.llm import generate_ai_response
                nova_prompt = (
                    "Are these two solutions functionally the same? "
                    "Ignore wording differences. Answer only YES or NO.\n\n"
                    f"Solution A: {solution_text}\n\n"
                    f"Solution B: {existing_solution.get('solution') if existing_solution else ''}"
                )
                nova_reply = (generate_ai_response(nova_prompt, max_tokens=64) or "").strip().lower()
                if "yes" in nova_reply:
                    classification = {
                        "is_duplicate": True, "decision": "duplicate",
                        "severity": "high", "confidence": float(best_similarity),
                    }
            except Exception as exc:
                logger.exception("[KnowledgeBase] Nova Lite confirmation failed: %s", exc)

        if classification["is_duplicate"]:
            return {
                "is_duplicate":      True,
                "decision":          classification["decision"],
                "reason":            "similarity",
                "similarity":        best_similarity,
                "solution_id":       candidate.get("id"),
                "metadata":          candidate.get("metadata") or {},
                "existing_solution": existing_solution,
                "duplicate_prompt":  True,
            }

        if best_similarity >= 0.90:
            return {
                "is_duplicate":      False,
                "decision":          "warn",
                "reason":            "similarity",
                "similarity":        best_similarity,
                "solution_id":       candidate.get("id"),
                "metadata":          candidate.get("metadata") or {},
                "existing_solution": existing_solution,
                "duplicate_prompt":  True,
            }

        return {
            "is_duplicate":  False,
            "decision":      "new",
            "reason":        "below_threshold",
            "similarity":    best_similarity,
            "duplicate_prompt": False,
        }

    except Exception as exc:
        logger.exception("[KnowledgeBase] Duplicate detection failed: %s", exc)
        return {"is_duplicate": False, "decision": "new",
                "reason": "error", "error": str(exc), "duplicate_prompt": False}


# ── Row lookups ───────────────────────────────────────────────────────────────

def _get_solution_metadata(solution_id: Optional[str]) -> Optional[Dict[str, Any]]:
    if not solution_id:
        return None
    row = _find_solution(solution_id)
    if not row:
        return None
    return {
        "id":               row.get("id"),
        "solution":         row.get("solution"),
        "created_by":       row.get("created_by"),
        "created_at":       row.get("created_at"),
        "version":          row.get("version"),
        "confidence_score": row.get("confidence_score"),
        "usage_count":      row.get("usage_count"),
    }


def _get_log_row(error_hash: str, project_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Find the log row matching an error_hash."""
    conditions = ["row_type = 'log'"]
    params: List[Any] = []
    hash_candidates = build_error_hash_candidates(error_hash, None)
    if hash_candidates:
        conditions.append(f"({' OR '.join(['error_hash = %s'] * len(hash_candidates))})")
        params.extend(hash_candidates)
    else:
        conditions.append("(error_hash = %s OR MD5(LOWER(TRIM(error))) = %s)")
        params.extend([error_hash, error_hash])
    if project_name:
        conditions.insert(0, "LOWER(project_name) = LOWER(%s)")
        params.insert(0, project_name)
    rows = query(
        f"SELECT id, project_name, error_hash FROM {TABLE} "
        f"WHERE {' AND '.join(conditions)} ORDER BY timestamp DESC LIMIT 1",
        tuple(params),
    )
    return rows[0] if rows else None


def _find_solution(solution_id: str) -> Optional[Dict[str, Any]]:
    rows = query(
        f"SELECT * FROM {TABLE} WHERE row_type = 'solution' AND id = %s",
        (solution_id,),
    )
    return rows[0] if rows else None


# ── Public API ────────────────────────────────────────────────────────────────

def insert_solution(
    error_hash: str,
    solution: str,
    created_by: str = "developer",
    project_name: Optional[str] = None,
    base_solution_id: Optional[str] = None,
    force_create: bool = False,
    check_only: bool = False,
) -> Dict[str, Any]:
    """Insert a new solution or return an existing duplicate.

    Duplicate detection order (cheapest first):
      1. Exact-text match  — no Bedrock call, no Pinecone call
      2. Semantic match    — Bedrock embedding + Pinecone
      (3. LLM confirmation — inside detect_duplicate_solution at 0.90–0.95)

    check_only=True: run duplicate detection and return the result without
      inserting.  If a duplicate is found, return it.  If no duplicate, return
      {"duplicate": False} so the caller knows a new row would be created.
      The frontend sends check_only=True first to surface the duplicate dialog
      before committing; it then sends check_only=False to actually save.

    force_create=True: bypass all duplicate checks (intentional user override
      e.g. "Create Anyway" in the duplicate dialog).
    """
    log_row = _get_log_row(error_hash, project_name)
    if not log_row:
        raise ValueError("No matching log row found")

    log_ref_id = log_row["id"]

    if not force_create:
        # Tier 1: exact-text (zero Bedrock cost) ─────────────────────────────
        exact_duplicate = _find_duplicate_solution(log_ref_id, solution, project_name)
        if exact_duplicate:
            payload = {
                "duplicate":        True,
                "duplicate_prompt": True,
                "decision":         "duplicate",
                "similarity":       1.0,
                "solution_id":      exact_duplicate.get("id"),
                "solution":         exact_duplicate.get("solution"),
                "created_by":       exact_duplicate.get("created_by"),
                "created_at":       exact_duplicate.get("created_at"),
                "version":          exact_duplicate.get("version"),
                "confidence_score": exact_duplicate.get("confidence_score"),
                "usage_count":      exact_duplicate.get("usage_count"),
            }
            logger.info(
                "[Duplicate] Exact duplicate found — solution_id=%s",
                exact_duplicate.get("id"),
            )
            return payload

        # Tier 2: semantic (Bedrock + Pinecone) ───────────────────────────────
        duplicate_check = detect_duplicate_solution(solution, error_hash, project_name)
        if duplicate_check.get("duplicate_prompt"):
            es = duplicate_check.get("existing_solution") or {}
            payload = {
                "duplicate":        True,
                "duplicate_prompt": True,
                "decision":         duplicate_check.get("decision"),
                "similarity":       duplicate_check.get("similarity"),
                "solution_id":      duplicate_check.get("solution_id"),
                "solution":         es.get("solution"),
                "created_by":       es.get("created_by"),
                "created_at":       es.get("created_at"),
                "version":          es.get("version"),
                "confidence_score": es.get("confidence_score"),
                "usage_count":      es.get("usage_count"),
            }
            logger.info(
                "[Duplicate] Semantic duplicate found — solution_id=%s score=%.3f",
                duplicate_check.get("solution_id"),
                duplicate_check.get("similarity") or 0.0,
            )
            return payload

    # check_only with no duplicate found — return preview without inserting
    if check_only:
        return {"duplicate": False, "duplicate_prompt": False}

    # No duplicate (or force_create) — insert a new version ──────────────────
    usage_count = 1
    confidence  = calculate_confidence(usage_count)
    embedding   = _create_embedding_safe(solution)

    last_exc: Optional[Exception] = None
    for attempt in range(MAX_VERSION_RETRIES):
        try:
            version_rows = query(
                f"SELECT COALESCE(MAX(version), 0) AS max_version FROM {TABLE} "
                f"WHERE row_type = 'solution' AND log_ref_id = %s",
                (log_ref_id,),
            )
            version = int((version_rows[0]["max_version"] or 0)) + 1

            row = execute_returning(
                f"INSERT INTO {TABLE} "
                f"(id, row_type, project_name, error_hash, log_ref_id, solution, "
                f"created_by, created_at, usage_count, version, confidence_score, embedding) "
                f"VALUES (%s,'solution',%s,%s,%s,%s,%s,NOW(),%s,%s,%s,%s) "
                f"RETURNING *",
                (
                    str(uuid.uuid4()),
                    log_row["project_name"],
                    error_hash,
                    log_ref_id,
                    solution,
                    created_by,
                    usage_count,
                    version,
                    confidence,
                    embedding,
                ),
            )
            if row:
                row["duplicate"] = False
                logger.info(
                    "[Solution] New version created — solution_id=%s version=%d project=%r",
                    row.get("id"), version,
                    row.get("project_name") or log_row.get("project_name"),
                )
                if embedding is not None:
                    try:
                        upsert_vector(
                            row["id"],
                            json.loads(embedding),
                            row.get("project_name") or log_row.get("project_name") or "",
                            error_hash,
                            version,
                        )
                    except Exception as exc:
                        logger.exception(
                            "[KnowledgeBase] Pinecone sync failed — solution saved to Aurora only: %s", exc
                        )
            return row

        except Exception as exc:
            last_exc = exc
            err_str  = str(exc).lower()
            if attempt < MAX_VERSION_RETRIES - 1 and (
                "unique" in err_str or "duplicate" in err_str or "serializ" in err_str
            ):
                logger.warning(
                    "[KnowledgeBase] Version conflict on attempt %d — retrying: %s",
                    attempt + 1, exc,
                )
                continue
            raise

    raise RuntimeError(
        f"[KnowledgeBase] insert_solution failed after {MAX_VERSION_RETRIES} attempts: {last_exc}"
    )


def increment_usage(solution_id: str) -> Dict[str, Any]:
    """Atomically increment usage_count and recompute confidence_score.

    Single UPDATE SET usage_count = usage_count + 1 eliminates the
    read-then-write race condition present in the original implementation.
    """
    incremented = execute_returning(
        f"UPDATE {TABLE} "
        f"SET usage_count = usage_count + 1 "
        f"WHERE row_type = 'solution' AND id = %s "
        f"RETURNING id, usage_count, version, confidence_score",
        (solution_id,),
    )
    if not incremented:
        raise ValueError("Solution not found")

    new_usage      = int(incremented.get("usage_count") or 1)
    new_confidence = calculate_confidence(new_usage)

    row = execute_returning(
        f"UPDATE {TABLE} SET confidence_score = %s "
        f"WHERE row_type = 'solution' AND id = %s RETURNING *",
        (new_confidence, solution_id),
    )
    if not row:
        raise ValueError("Solution not found after confidence update")
    return row


def delete_solution_version(solution_id: str) -> int:
    """Delete a single solution version and its Pinecone vector."""
    count = execute(
        f"DELETE FROM {TABLE} WHERE row_type = 'solution' AND id = %s",
        (solution_id,),
    )
    if count > 0:
        try:
            delete_vector(solution_id)
        except Exception as exc:
            logger.exception("[KnowledgeBase] Pinecone delete failed: %s", exc)
    return count


def get_top_solutions(
    error_hash: str,
    project_name: Optional[str] = None,
    limit: int = 5,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    conditions = ["row_type = 'solution'"]
    params: List[Any] = []
    hash_candidates = build_error_hash_candidates(error_hash, None)
    if hash_candidates:
        conditions.append(f"({' OR '.join(['error_hash = %s'] * len(hash_candidates))})")
        params.extend(hash_candidates)
    else:
        conditions.append(
            f"(error_hash = %s OR error_hash IN ("
            f"  SELECT error_hash FROM {TABLE} WHERE row_type = 'log' "
            f"  AND MD5(LOWER(TRIM(error))) = %s))"
        )
        params.extend([error_hash, error_hash])
    if project_name:
        normalized_project = normalize_project_name(project_name)
        if normalized_project:
            conditions.append("LOWER(project_name) = LOWER(%s)")
            params.append(project_name)

    where = " AND ".join(conditions)
    rows = query(
        f"SELECT id, solution, created_by, created_at, usage_count, "
        f"confidence_score, version, log_ref_id "
        f"FROM {TABLE} WHERE {where} "
        f"ORDER BY confidence_score DESC, usage_count DESC, created_at DESC "
        f"LIMIT %s OFFSET %s",
        tuple(params + [limit, offset]),
    )
    total_rows = query(
        f"SELECT COUNT(*) AS total FROM {TABLE} WHERE {where}",
        tuple(params),
    )
    total = int(total_rows[0]["total"]) if total_rows else 0
    return rows, total


def get_solution_versions(solution_id: str) -> List[Dict[str, Any]]:
    row = _find_solution(solution_id)
    if not row:
        return []
    return query(
        f"SELECT id, solution, created_by, created_at, usage_count, confidence_score, version "
        f"FROM {TABLE} WHERE row_type = 'solution' AND log_ref_id = %s "
        f"ORDER BY version DESC",
        (row["log_ref_id"],),
    )


def get_solution_by_id(solution_id: str) -> Optional[Dict[str, Any]]:
    return _find_solution(solution_id)
