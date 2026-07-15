"""AI recommendation pipeline.

Architecture:
  1. Generate ONE Gemini embedding for the current error
  2. Pull candidate solutions from Aurora DSQL (pre-filtered by project / hash)
  3. Compute cosine similarity with NumPy (no FAISS, no SentenceTransformers)
  4. Return top-N ranked solutions
  5. Pass to LLM (Gemini → Groq → LlamaCloud fallback) for a concise recommendation

Frontend payload is unchanged:
  { recommendation: str | None, solutions: [...] }
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np

from ai.embeddings import create_embedding, cosine_similarity, EMBEDDING_DIM
from ai.llm import generate_suggested_solution
from db import query

TABLE = "projects_data"


def _serialize_solution(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row.get("id"),
        "solution": row.get("solution"),
        "created_by": row.get("created_by"),
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "usage_count": row.get("usage_count"),
        "confidence_score": row.get("confidence_score"),
        "version": row.get("version"),
    }


def _parse_embedding(raw: Any) -> Optional[List[float]]:
    """Parse embedding from the DB.

    The live schema stores embedding as TEXT (JSON array).
    This handles both a raw list (if the driver ever returns one)
    and a JSON string gracefully, returning None on any failure.
    """
    if raw is None:
        return None
    if isinstance(raw, list):
        return raw if len(raw) > 0 else None
    if isinstance(raw, str):
        try:
            import json as _json
            parsed = _json.loads(raw)
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed
        except Exception:
            pass
    return None


def _rank_by_cosine(
    query_vec: List[float],
    candidates: List[Dict[str, Any]],
    limit: int,
) -> List[Dict[str, Any]]:
    """Rank candidates by cosine similarity to query_vec.

    Candidates whose stored embedding is missing, unparseable, or the wrong
    dimension fall back to their confidence_score rank.
    """
    scored: List[tuple[float, Dict[str, Any]]] = []
    unscored: List[Dict[str, Any]] = []

    for row in candidates:
        emb = _parse_embedding(row.get("embedding"))
        if emb and len(emb) == EMBEDDING_DIM:
            try:
                sim = cosine_similarity(query_vec, emb)
                scored.append((sim, row))
            except Exception:
                unscored.append(row)
        else:
            unscored.append(row)

    scored.sort(key=lambda t: t[0], reverse=True)
    ranked = [row for _, row in scored] + unscored
    return ranked[:limit]


def get_similar_solutions(
    error_hash: str,
    project_name: Optional[str] = None,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """Return up to *limit* solutions ranked by semantic similarity.

    Steps:
      1. Look up the error text from projects_data
      2. Generate a Gemini embedding for the error
      3. Pull candidate solutions from projects_data WHERE row_type='solution'
      4. Re-rank by cosine similarity
    """
    # ── 1. Fetch error text ──────────────────────────────────────────────────
    conditions = ["row_type = 'log'",
                  "(error_hash = %s OR MD5(LOWER(TRIM(error))) = %s)"]
    params: List[Any] = [error_hash, error_hash]
    if project_name:
        conditions.insert(0, "LOWER(project_name) = LOWER(%s)")
        params.insert(0, project_name)

    error_rows = query(
        f"SELECT error AS error_message, error_detail "
        f"FROM {TABLE} "
        f"WHERE {' AND '.join(conditions)} "
        f"LIMIT 1",
        tuple(params),
    )
    if not error_rows:
        return []

    error_text  = (error_rows[0].get("error_message") or "")
    detail_text = (error_rows[0].get("error_detail") or "")
    query_text  = f"{error_text}\n\n{detail_text}".strip() or error_text

    # ── 2. Generate embedding for the error ──────────────────────────────────
    query_vec = create_embedding(query_text)

    # ── 3. Pull candidates from projects_data (SQL pre-filter, up to 50) ────
    sol_conditions: List[str] = ["row_type = 'solution'"]
    sol_params: List[Any] = []
    if project_name:
        sol_conditions.append("LOWER(project_name) = LOWER(%s)")
        sol_params.append(project_name)

    candidates = query(
        f"SELECT id, solution, created_by, created_at, "
        f"usage_count, confidence_score, version, embedding "
        f"FROM {TABLE} "
        f"WHERE {' AND '.join(sol_conditions)} "
        f"ORDER BY confidence_score DESC, usage_count DESC, created_at DESC "
        f"LIMIT 50",
        tuple(sol_params) if sol_params else None,
    )

    if not candidates:
        return []

    # ── 4. Re-rank by cosine similarity ──────────────────────────────────────
    ranked = _rank_by_cosine(query_vec, candidates, limit)
    return [_serialize_solution(r) for r in ranked]


def get_ai_recommendations(
    error_hash: str,
    project_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Return { recommendation: str|None, solutions: [...] }.

    Payload shape is unchanged — frontend requires no update.
    """
    solutions = get_similar_solutions(error_hash, project_name, limit=10)
    if not solutions:
        return {"recommendation": None, "solutions": []}

    # Fetch error text for the LLM prompt
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

    # LLM fallback chain lives inside generate_suggested_solution
    recommendation = generate_suggested_solution(prompt, solutions[:5])
    return {"recommendation": recommendation, "solutions": solutions}
