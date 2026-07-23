"""AI recommendation pipeline backed by Bedrock embeddings and Nova Lite.

The public response shape remains unchanged so the frontend does not need to change.

Retrieval strategy (semantic-first, three-tier):
  TIER 1 — Pinecone semantic search scoped to project_name (no hash filter).
            Fetches up to PINECONE_CANDIDATE_LIMIT solution IDs by vector similarity,
            then hydrates rows from Aurora.
            Skipped when project_name is absent (would return cross-project data).
  TIER 2 — Aurora in-process scan.  Used when Pinecone is unavailable.
            Fetches all solution rows for the project (up to AURORA_SCAN_LIMIT),
            computes cosine similarity in Python, keeps rows above SIM_THRESHOLD.
            Skipped when project_name is absent (would return cross-project data).
  TIER 3 — Original hash-exact SQL fallback.  Used when embeddings are unavailable
            (Bedrock down), when TIER 1+2 return nothing, or when project_name is
            absent.  Logs a warning when project_name is missing so operators know
            the request is running without project isolation.

Hash equality is used only in TIER 3 and as a tiebreaker log field — never as the
primary retrieval gate.  This allows solutions saved for Error Hash A to surface for
semantically similar Error Hash B inside the same project.

Project isolation guarantee
  TIER 1 and TIER 2 are only executed when project_name is provided.
  They will never be run without a project filter, preventing cross-project leaks.
  TIER 3 preserves backward compatibility for callers that omit project_name,
  but logs a warning so the gap can be remediated at the call site.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from ai.embeddings import EMBEDDING_DIM
from db import query

logger = logging.getLogger(__name__)

TABLE = "projects_data"

# ── Tunable constants ─────────────────────────────────────────────────────────
PINECONE_CANDIDATE_LIMIT = 20   # vectors retrieved from Pinecone per query
AURORA_SCAN_LIMIT        = 200  # rows scanned when Pinecone is unavailable
SIM_THRESHOLD            = 0.30 # minimum cosine similarity to include a result
RANK_LIMIT               = 50   # candidates passed into _rank_candidates


# ── Internal helpers ──────────────────────────────────────────────────────────

def _get_embeddings():
    try:
        from ai.embeddings import create_embedding, cosine_similarity
        return create_embedding, cosine_similarity
    except Exception as exc:
        logger.exception("[Recommendations] Embeddings import failed: %s", exc)
        return None, None


def _get_llm():
    try:
        from ai.llm import generate_suggested_solution
        return generate_suggested_solution
    except Exception as exc:
        logger.exception("[Recommendations] LLM import failed: %s", exc)
        return None


def _serialize_solution(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id":               row.get("id"),
        "solution":         row.get("solution"),
        "created_by":       row.get("created_by"),
        "created_at":       row["created_at"].isoformat() if row.get("created_at") else None,
        "usage_count":      row.get("usage_count"),
        "confidence_score": row.get("confidence_score"),
        "version":          row.get("version"),
    }


def _parse_embedding(raw: Any) -> Optional[List[float]]:
    """Parse embedding from the DB TEXT column (JSON array).
    Returns None on any failure — callers treat missing embeddings as unscored.
    """
    if raw is None:
        return None
    if isinstance(raw, list):
        return raw if len(raw) > 0 else None
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed
        except Exception:
            pass
    return None


def _rank_candidates(
    query_vec: List[float],
    candidates: List[Dict[str, Any]],
    limit: int,
    cosine_similarity_fn: Any,
) -> List[Dict[str, Any]]:
    """Score and rank candidates.

    Combined score = (cosine * 0.7) + (confidence * 0.2) + (usage * 0.1)
    Rows without valid embeddings are appended after scored rows in SQL order.
    """
    scored:   List[Tuple[float, Dict[str, Any]]] = []
    unscored: List[Dict[str, Any]]               = []

    for row in candidates:
        emb = _parse_embedding(row.get("embedding"))
        if emb and len(emb) == EMBEDDING_DIM:
            try:
                sim        = cosine_similarity_fn(query_vec, emb)
                confidence = float(row.get("confidence_score") or 0.0) / 100.0
                usage      = min(int(row.get("usage_count") or 0), 20) / 20.0
                combined   = (sim * 0.7) + (confidence * 0.2) + (usage * 0.1)
                scored.append((combined, row))
            except Exception as exc:
                logger.warning("[Recommendations] Scoring failed for row %s: %s",
                               row.get("id"), exc)
                unscored.append(row)
        else:
            unscored.append(row)

    scored.sort(key=lambda item: item[0], reverse=True)
    ranked = [row for _, row in scored] + unscored
    return ranked[:limit]


# ── Candidate fetch helpers (three tiers) ────────────────────────────────────

def _fetch_error_text(error_hash: str, project_name: Optional[str]) -> Tuple[str, str]:
    """Return (error_message, error_detail) for the given hash."""
    conditions = [
        "row_type = 'log'",
        "(error_hash = %s OR MD5(LOWER(TRIM(error))) = %s)",
    ]
    params: List[Any] = [error_hash, error_hash]
    if project_name:
        conditions.insert(0, "LOWER(project_name) = LOWER(%s)")
        params.insert(0, project_name)

    rows = query(
        f"SELECT error AS error_message, error_detail "
        f"FROM {TABLE} "
        f"WHERE {' AND '.join(conditions)} "
        f"LIMIT 1",
        tuple(params),
    )
    if not rows:
        return "", ""
    return (rows[0].get("error_message") or ""), (rows[0].get("error_detail") or "")


def _tier1_pinecone(
    query_vec: List[float],
    project_name: Optional[str],
) -> List[Dict[str, Any]]:
    """TIER 1 — Pinecone semantic search, project-scoped, no hash filter.

    Returns hydrated Aurora rows for the matched solution IDs.
    Returns [] on any failure so the caller falls through to TIER 2.
    """
    try:
        from ai.pinecone_service import query_similar

        matches = query_similar(
            solution_id=None,
            embedding=query_vec,
            project_name=project_name,
            limit=PINECONE_CANDIDATE_LIMIT,
            error_hash=None,    # no hash filter — enables cross-hash retrieval
        )
        if not matches:
            logger.info("[Recommendation] TIER 1 Pinecone returned 0 matches")
            return []

        solution_ids = [m.get("id") for m in matches if m.get("id")]
        if not solution_ids:
            return []

        logger.info("[Recommendation] TIER 1 Pinecone returned %d candidate IDs",
                    len(solution_ids))

        # Hydrate from Aurora with project_name filter to enforce isolation
        placeholders = ", ".join(["%s"] * len(solution_ids))
        hydrate_conditions = [
            "row_type = 'solution'",
            f"id IN ({placeholders})",
        ]
        hydrate_params: List[Any] = list(solution_ids)
        if project_name:
            hydrate_conditions.append("LOWER(project_name) = LOWER(%s)")
            hydrate_params.append(project_name)

        rows = query(
            f"SELECT id, solution, created_by, created_at, "
            f"usage_count, confidence_score, version, embedding "
            f"FROM {TABLE} "
            f"WHERE {' AND '.join(hydrate_conditions)}",
            tuple(hydrate_params),
        )
        logger.info("[Recommendation] TIER 1 hydrated %d rows from Aurora", len(rows))
        return rows

    except Exception as exc:
        logger.exception(
            "[Pinecone] Unavailable — falling through to TIER 2: %s", exc
        )
        return []


def _tier2_aurora_scan(
    query_vec: List[float],
    project_name: Optional[str],
    cosine_similarity_fn: Any,
) -> List[Dict[str, Any]]:
    """TIER 2 — Aurora full-project scan + in-process cosine filter.

    Fetches up to AURORA_SCAN_LIMIT rows for the project, computes cosine
    similarity in Python, keeps rows above SIM_THRESHOLD.
    Returns [] on any failure so the caller falls through to TIER 3.
    """
    try:
        scan_conditions = ["row_type = 'solution'", "embedding IS NOT NULL"]
        scan_params: List[Any] = []
        if project_name:
            scan_conditions.append("LOWER(project_name) = LOWER(%s)")
            scan_params.append(project_name)

        rows = query(
            f"SELECT id, solution, created_by, created_at, "
            f"usage_count, confidence_score, version, embedding "
            f"FROM {TABLE} "
            f"WHERE {' AND '.join(scan_conditions)} "
            f"ORDER BY confidence_score DESC, usage_count DESC, created_at DESC "
            f"LIMIT %s",
            tuple(scan_params + [AURORA_SCAN_LIMIT]),
        )
        if not rows:
            logger.info("[Recommendation] TIER 2 Aurora: no embedded solutions for project")
            return []

        logger.info("[Recommendation] TIER 2 Aurora: scanning %d rows", len(rows))

        above_threshold: List[Dict[str, Any]] = []
        for row in rows:
            emb = _parse_embedding(row.get("embedding"))
            if not emb or len(emb) != EMBEDDING_DIM:
                continue
            try:
                sim = cosine_similarity_fn(query_vec, emb)
                if sim >= SIM_THRESHOLD:
                    above_threshold.append(row)
            except Exception as exc:
                logger.warning("[Recommendation] TIER 2 cosine failed for row %s: %s",
                               row.get("id"), exc)
                continue

        logger.info("[Recommendation] TIER 2 Aurora: %d rows above threshold %.2f",
                    len(above_threshold), SIM_THRESHOLD)
        return above_threshold

    except Exception as exc:
        logger.exception(
            "[Aurora] TIER 2 scan failed — falling through to TIER 3: %s", exc
        )
        return []


def _tier3_hash_fallback(
    error_hash: str,
    project_name: Optional[str],
) -> List[Dict[str, Any]]:
    """TIER 3 — Original hash-exact SQL lookup.

    Preserved for backward compatibility and when Bedrock is unavailable.
    Always logs to make degraded operation visible.
    """
    try:
        sol_conditions: List[str] = ["row_type = 'solution'", "error_hash = %s"]
        sol_params: List[Any]     = [error_hash]
        if project_name:
            sol_conditions.append("LOWER(project_name) = LOWER(%s)")
            sol_params.append(project_name)

        rows = query(
            f"SELECT id, solution, created_by, created_at, "
            f"usage_count, confidence_score, version, embedding "
            f"FROM {TABLE} "
            f"WHERE {' AND '.join(sol_conditions)} "
            f"ORDER BY confidence_score DESC, usage_count DESC, created_at DESC "
            f"LIMIT %s",
            tuple(sol_params + [RANK_LIMIT]),
        )
        logger.info("[Recommendation] TIER 3 hash fallback: hash=%r project=%r rows=%d",
                    error_hash, project_name, len(rows))
        return rows

    except Exception as exc:
        logger.exception(
            "[Aurora] TIER 3 hash fallback failed: %s", exc
        )
        return []


# ── Public API ────────────────────────────────────────────────────────────────

def get_similar_solutions(
    error_hash: str,
    project_name: Optional[str] = None,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """Return up to *limit* solutions ranked by semantic similarity.

    Retrieval is semantic-first, project-scoped, with three fallback tiers:
      TIER 1: Pinecone vector search (project-wide, cross-hash)
      TIER 2: Aurora in-process cosine scan (project-wide, cross-hash)
      TIER 3: Hash-exact SQL (backward-compatible, original behaviour)

    Response shape is unchanged regardless of which tier provided candidates.
    """
    create_embedding, cosine_similarity = _get_embeddings()

    # Step 1: fetch error text to build the query embedding ───────────────────
    try:
        error_text, detail_text = _fetch_error_text(error_hash, project_name)
    except Exception as exc:
        logger.exception("[Recommendations] Error text fetch failed: %s", exc)
        return []

    if not error_text and not detail_text:
        logger.info("[Recommendations] No error text found for hash=%r — returning empty",
                    error_hash)
        return []

    query_text = f"{error_text}\n\n{detail_text}".strip() or error_text

    # Step 2: generate query embedding ────────────────────────────────────────
    query_vec: Optional[List[float]] = None
    if create_embedding:
        try:
            query_vec = create_embedding(query_text)
        except Exception as exc:
            logger.exception(
                "[Bedrock] Embedding generation failed — falling back to TIER 3: %s", exc
            )

    # Step 3: candidate fetch (tiered) ────────────────────────────────────────
    # Project isolation: TIER 1 and TIER 2 require project_name.
    # TIER 3 runs without it for backward compatibility but logs a warning.
    candidates: List[Dict[str, Any]] = []

    if query_vec and project_name:
        candidates = _tier1_pinecone(query_vec, project_name)

        if not candidates and cosine_similarity:
            logger.info("[Recommendation] TIER 1 empty — trying TIER 2 (Aurora scan)")
            candidates = _tier2_aurora_scan(query_vec, project_name, cosine_similarity)

    elif query_vec and not project_name:
        logger.warning(
            "[Recommendations] project_name missing — "
            "TIER 1 and TIER 2 skipped to prevent cross-project leaks. "
            "Falling through to TIER 3."
        )

    if not candidates:
        if not project_name:
            logger.warning(
                "[Recommendations] TIER 3 running without project isolation — hash=%r",
                error_hash
            )
        else:
            logger.info("[Recommendation] Semantic tiers empty — using TIER 3 (hash fallback)")
        candidates = _tier3_hash_fallback(error_hash, project_name)

    if not candidates:
        return []

    # Step 4: rank ─────────────────────────────────────────────────────────────
    if query_vec and cosine_similarity:
        try:
            ranked = _rank_candidates(query_vec, candidates, limit, cosine_similarity)
        except Exception as exc:
            logger.exception(
                "[Recommendations] Ranking failed — using candidate order: %s", exc
            )
            ranked = candidates[:limit]
    else:
        ranked = candidates[:limit]

    return [_serialize_solution(r) for r in ranked]


def get_ai_recommendations(
    error_hash: str,
    project_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Return { recommendation: str|None, solutions: [...] }.

    Payload shape is unchanged — frontend requires no update.
    """
    try:
        solutions = get_similar_solutions(error_hash, project_name, limit=10)
        if not solutions:
            return {"recommendation": None, "solutions": []}

        error_rows = query(
            f"SELECT error AS error_message, error_detail "
            f"FROM {TABLE} "
            f"WHERE row_type = 'log' AND error_hash = %s "
            f"LIMIT 1",
            (error_hash,),
        )
        prompt = (error_rows[0].get("error_message") if error_rows else "") or ""
        detail = (error_rows[0].get("error_detail") if error_rows else "") or ""
        if detail:
            prompt = f"{prompt}\n\nDetails:\n{detail}".strip()

        generate_suggested_solution = _get_llm()
        if generate_suggested_solution:
            recommendation = generate_suggested_solution(prompt, solutions[:5])
        else:
            recommendation = None
            logger.warning("[Recommendations] LLM unavailable — returning solutions without recommendation")

        return {"recommendation": recommendation, "solutions": solutions}

    except Exception as exc:
        logger.exception(
            "[Recommendations] Recommendation generation failed — returning empty payload: %s", exc
        )
        return {"recommendation": None, "solutions": []}
