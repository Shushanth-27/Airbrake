"""AI recommendation helpers for the Python backend."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ai.embeddings import create_embedding
from ai.faiss_index import get_faiss_index
from ai.llm import generate_suggested_solution
from db import query


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


def get_similar_solutions(
    error_hash: str,
    project_name: Optional[str] = None,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    conditions = ["(pr.error_hash = %s OR MD5(LOWER(TRIM(pr.error))) = %s)"]
    params: List[Any] = [error_hash, error_hash]
    if project_name:
        conditions.insert(0, "LOWER(pr.project_name) = LOWER(%s)")
        params.insert(0, project_name)

    error_rows = query(
        f"""
        SELECT pr.error AS error_message, pr.error_detail
        FROM project_results pr
        WHERE {' AND '.join(conditions)}
        LIMIT 1
        """,
        tuple(params),
    )
    if not error_rows:
        return []

    prompt = error_rows[0].get("error_message") or ""
    detail = error_rows[0].get("error_detail") or ""
    query_text = f"{prompt}\n\n{detail}".strip()

    try:
        query_embedding = create_embedding(query_text)
    except Exception:
        return []

    faiss_index = get_faiss_index()
    candidate_ids = [item["id"] for item in faiss_index.query(query_embedding, k=limit, project_name=project_name)]

    if not candidate_ids:
        return []

    rows = query(
        f"""
        SELECT kb.id, kb.solution, kb.created_by, kb.created_at, kb.usage_count,
               kb.confidence_score, kb.version
        FROM knowledge_base kb
        WHERE kb.id = ANY(%s)
        ORDER BY kb.confidence_score DESC, kb.usage_count DESC, kb.created_at DESC
        LIMIT %s
        """,
        (candidate_ids, limit),
    )
    return [_serialize_solution(r) for r in rows]


def get_ai_recommendations(
    error_hash: str,
    project_name: Optional[str] = None,
) -> Dict[str, Any]:
    suggestions = get_similar_solutions(error_hash, project_name)
    if not suggestions:
        return {"recommendation": None, "solutions": []}

    error_rows = query(
        """
        SELECT error AS error_message, error_detail
        FROM project_results
        WHERE error_hash = %s
        LIMIT 1
        """,
        (error_hash,),
    )
    prompt = (error_rows[0].get("error_message") if error_rows else "") or ""
    detail = (error_rows[0].get("error_detail") if error_rows else "") or ""
    if detail:
        prompt = f"{prompt}\n\nDetails:\n{detail}".strip()

    recommendation = generate_suggested_solution(prompt, suggestions)
    return {"recommendation": recommendation, "solutions": suggestions}
