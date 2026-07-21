"""Knowledge base helpers — solution versioning, metrics, and Bedrock embeddings."""

from __future__ import annotations

import json
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from ai.error_matching import build_error_hash_candidates, normalize_project_name
from ai.pinecone_service import delete_vector, query_similar, upsert_vector
from db import execute, execute_returning, query


def _create_embedding_safe(text: str) -> Optional[str]:
    """Generate a Titan embedding and return it as a JSON string for the TEXT column."""
    try:
        from ai.embeddings import create_embedding
        vec = create_embedding(text)
        if vec and any(v != 0.0 for v in vec):
            return json.dumps(vec)
        return None
    except Exception as exc:
        print(f"[KnowledgeBase] embedding failed — solution will be saved without it: {exc}")
        return None


def calculate_confidence(usage_count: int) -> float:
    return round(min(100.0, 50.0 + float(usage_count) * 2.0), 2)


TABLE = "projects_data"


def classify_duplicate_solution(similarity: Optional[float], confirmation: Optional[bool] = None) -> Dict[str, Any]:
    """Return a structured decision for duplicate detection thresholds."""
    if similarity is None:
        return {"is_duplicate": False, "decision": "new", "severity": "none", "confidence": 0.0}
    if similarity >= 0.95:
        return {"is_duplicate": True, "decision": "duplicate", "severity": "high", "confidence": float(similarity)}
    if similarity >= 0.90:
        return {"is_duplicate": False, "decision": "warn", "severity": "medium", "confidence": float(similarity)}
    return {"is_duplicate": False, "decision": "new", "severity": "low", "confidence": float(similarity)}


def _normalize_solution_text(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def _find_duplicate_solution(log_ref_id: str, solution_text: str) -> Optional[Dict[str, Any]]:
    normalized = _normalize_solution_text(solution_text)
    if not normalized:
        return None
    rows = query(
        f"SELECT id, usage_count, confidence_score, version, solution FROM {TABLE} "
        f"WHERE row_type = 'solution' AND log_ref_id = %s ORDER BY created_at DESC",
        (log_ref_id,),
    )
    for row in rows:
        if _normalize_solution_text(row.get("solution")) == normalized:
            return row
    return None


def _get_solution_metadata(solution_id: Optional[str]) -> Optional[Dict[str, Any]]:
    if not solution_id:
        return None
    row = _find_solution(solution_id)
    if not row:
        return None
    return {
        "id": row.get("id"),
        "solution": row.get("solution"),
        "created_by": row.get("created_by"),
        "created_at": row.get("created_at"),
        "version": row.get("version"),
        "confidence_score": row.get("confidence_score"),
        "usage_count": row.get("usage_count"),
    }


def detect_duplicate_solution(
    solution_text: str,
    error_hash: str,
    project_name: Optional[str] = None,
    limit: int = 5,
) -> Dict[str, Any]:
    """Best-effort duplicate detection that fails open and only uses Pinecone when available."""
    try:
        from ai.embeddings import create_embedding

        embedding = create_embedding(solution_text)
        if not embedding:
            return {"is_duplicate": False, "decision": "new", "reason": "embedding_unavailable", "duplicate_prompt": False}

        matches = query_similar(None, embedding, project_name, limit=limit, error_hash=error_hash)
        if not matches:
            return {"is_duplicate": False, "decision": "new", "reason": "no_matches", "duplicate_prompt": False}

        candidate = None
        best_similarity = 0.0
        for match in matches:
            metadata = match.get("metadata") or {}
            if metadata.get("error_hash") and metadata.get("error_hash") != error_hash:
                continue
            if not metadata.get("solution_id"):
                continue
            similarity = max(float(match.get("score") or 0.0), 0.0)
            if similarity > best_similarity:
                best_similarity = similarity
                candidate = match

        if not candidate:
            return {"is_duplicate": False, "decision": "new", "reason": "no_matching_error", "duplicate_prompt": False}

        existing_solution = _get_solution_metadata(candidate.get("id"))
        if not existing_solution and candidate.get("metadata"):
            existing_solution = {
                "id": candidate.get("id"),
                "solution": candidate.get("metadata", {}).get("solution"),
                "created_by": candidate.get("metadata", {}).get("created_by"),
                "created_at": candidate.get("metadata", {}).get("created_at"),
                "version": candidate.get("metadata", {}).get("version"),
                "confidence_score": candidate.get("metadata", {}).get("confidence_score"),
                "usage_count": candidate.get("metadata", {}).get("usage_count"),
            }

        classification = classify_duplicate_solution(best_similarity)
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
                    classification = {"is_duplicate": True, "decision": "duplicate", "severity": "high", "confidence": float(best_similarity)}
            except Exception as exc:
                print(f"[KnowledgeBase] Nova confirmation skipped — {exc}")

        if classification["is_duplicate"]:
            return {
                "is_duplicate": True,
                "decision": classification["decision"],
                "reason": "similarity",
                "similarity": best_similarity,
                "solution_id": candidate.get("id"),
                "metadata": candidate.get("metadata") or {},
                "existing_solution": existing_solution,
                "duplicate_prompt": True,
            }

        if best_similarity >= 0.90:
            return {
                "is_duplicate": False,
                "decision": "warn",
                "reason": "similarity",
                "similarity": best_similarity,
                "solution_id": candidate.get("id"),
                "metadata": candidate.get("metadata") or {},
                "existing_solution": existing_solution,
                "duplicate_prompt": True,
            }
        return {"is_duplicate": False, "decision": "new", "reason": "below_threshold", "similarity": best_similarity, "duplicate_prompt": False}
    except Exception as exc:
        print(f"[KnowledgeBase] duplicate detection failed — {exc}")
        return {"is_duplicate": False, "decision": "new", "reason": "error", "error": str(exc), "duplicate_prompt": False}


def _get_log_row(error_hash: str, project_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Find the log row matching an error_hash."""
    conditions = ["row_type = 'log'"]
    params: List[Any] = []
    hash_candidates = build_error_hash_candidates(error_hash, None)
    if hash_candidates:
        hash_clauses = ["error_hash = %s"] * len(hash_candidates)
        conditions.append(f"({' OR '.join(hash_clauses)})")
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
    """Find a solution row by id."""
    rows = query(
        f"SELECT * FROM {TABLE} WHERE row_type = 'solution' AND id = %s",
        (solution_id,),
    )
    return rows[0] if rows else None


# ── public API ────────────────────────────────────────────────────────────────

def insert_solution(
    error_hash: str,
    solution: str,
    created_by: str = "developer",
    project_name: Optional[str] = None,
    base_solution_id: Optional[str] = None,
    force_create: bool = False,
    check_only: bool = False,
) -> Dict[str, Any]:
    log_row = _get_log_row(error_hash, project_name)
    if not log_row:
        raise ValueError('No matching log row found')

    log_ref_id = log_row['id']
    if not force_create:
        duplicate_check = detect_duplicate_solution(solution, error_hash, project_name)
        if duplicate_check.get("duplicate_prompt"):
            payload = {
                "duplicate": True,
                "duplicate_prompt": True,
                "decision": duplicate_check.get("decision"),
                "similarity": duplicate_check.get("similarity"),
                "solution_id": duplicate_check.get("solution_id"),
                "solution": duplicate_check.get("existing_solution", {}).get("solution"),
                "created_by": duplicate_check.get("existing_solution", {}).get("created_by"),
                "created_at": duplicate_check.get("existing_solution", {}).get("created_at"),
                "version": duplicate_check.get("existing_solution", {}).get("version"),
                "confidence_score": duplicate_check.get("existing_solution", {}).get("confidence_score"),
                "usage_count": duplicate_check.get("existing_solution", {}).get("usage_count"),
            }
            if check_only:
                return payload
            return payload

        exact_duplicate = _find_duplicate_solution(log_ref_id, solution)
        if exact_duplicate:
            payload = {
                "duplicate": True,
                "duplicate_prompt": True,
                "decision": "duplicate",
                "similarity": 1.0,
                "solution_id": exact_duplicate.get("id"),
                "solution": exact_duplicate.get("solution"),
                "created_by": exact_duplicate.get("created_by"),
                "created_at": exact_duplicate.get("created_at"),
                "version": exact_duplicate.get("version"),
                "confidence_score": exact_duplicate.get("confidence_score"),
                "usage_count": exact_duplicate.get("usage_count"),
            }
            if check_only:
                return payload
            return payload

    version_rows = query(
        f"SELECT MAX(version) AS max_version FROM {TABLE} "
        f"WHERE row_type = 'solution' AND log_ref_id = %s",
        (log_ref_id,),
    )
    version       = int(version_rows[0]["max_version"] or 0) + 1
    usage_count   = 1
    confidence    = calculate_confidence(usage_count)

    embedding = _create_embedding_safe(solution)

    row = execute_returning(
        f"INSERT INTO {TABLE} "
        f"(id, row_type, project_name, error_hash, log_ref_id, solution, created_by, "
        f"created_at, usage_count, version, confidence_score, embedding) "
        f"VALUES (%s,'solution',%s,%s,%s,%s,%s,NOW(),%s,%s,%s,%s) "
        f"RETURNING *",
        (
            str(uuid.uuid4()),
            log_row['project_name'],
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

    if row and embedding is not None:
        try:
            upsert_vector(
                row["id"],
                json.loads(embedding),
                row.get("project_name") or log_row.get("project_name") or "",
                error_hash,
                version,
            )
        except Exception as exc:
            print(f"[KnowledgeBase] Pinecone sync failed: {exc}")
    return row


def increment_usage(solution_id: str) -> Dict[str, Any]:
    existing = _find_solution(solution_id)
    if not existing:
        raise ValueError("Solution not found")

    usage_count = int(existing.get("usage_count") or 0) + 1
    confidence  = calculate_confidence(usage_count)

    row = execute_returning(
        f"UPDATE {TABLE} SET usage_count = %s, confidence_score = %s "
        f"WHERE row_type = 'solution' AND id = %s RETURNING *",
        (usage_count, confidence, solution_id),
    )
    if not row:
        raise ValueError("Solution not found")
    return row


def delete_solution_version(solution_id: str) -> int:
    """Delete a single solution version and its Pinecone vector when present."""
    count = execute(
        f"DELETE FROM {TABLE} WHERE row_type = 'solution' AND id = %s",
        (solution_id,),
    )
    if count > 0:
        delete_vector(solution_id)
    return count


def get_top_solutions(
    error_hash: str,
    project_name: Optional[str] = None,
    limit: int = 5,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    conditions = [
        "row_type = 'solution'",
    ]
    params: List[Any] = []
    hash_candidates = build_error_hash_candidates(error_hash, None)
    if hash_candidates:
        hash_clauses = ["error_hash = %s"] * len(hash_candidates)
        conditions.append(f"({' OR '.join(hash_clauses)})")
        params.extend(hash_candidates)
    else:
        conditions.append("(error_hash = %s OR error_hash IN ("
        f"  SELECT error_hash FROM {TABLE} WHERE row_type = 'log' "
        f"  AND MD5(LOWER(TRIM(error))) = %s))")
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
        (row['log_ref_id'],),
    )


def get_solution_by_id(solution_id: str) -> Optional[Dict[str, Any]]:
    return _find_solution(solution_id)
