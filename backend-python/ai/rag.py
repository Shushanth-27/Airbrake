"""Retrieval helpers — MongoDB-based retrieval with optional FAISS upgrade."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from db import knowledge_base


def retrieve_similar_solutions(
    query: str,
    k: int = 5,
    error_hash: Optional[str] = None,
    project_name: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieve solutions from MongoDB filtered by error_hash/project_name.

    On the free Render tier we skip FAISS/sentence-transformers entirely to
    stay within the 512 MB RAM limit.  Solutions are ranked by usage_count
    and version instead of vector similarity.  The Groq LLM still generates
    a meaningful recommendation from the top results.
    """
    if not query.strip():
        return []

    mongo_filter: Dict[str, Any] = {}
    if error_hash:
        mongo_filter["error_hash"] = error_hash

    try:
        docs = list(
            knowledge_base.find(mongo_filter)
            .sort([("usage_count", -1), ("version", -1)])
            .limit(k)
        )
    except Exception:
        return []

    ranked: List[Dict[str, Any]] = []
    for doc in docs:
        doc_id = str(doc.get("id") or doc.get("_id") or "")
        if not doc_id:
            continue

        # Optional project filter
        if project_name:
            rp = str(doc.get("project_name") or "").strip().lower()
            if rp and rp != project_name.strip().lower():
                continue

        usage_count = int(doc.get("usage_count") or 0)
        version = int(doc.get("version") or 1)
        updated_at = doc.get("updated_at") or doc.get("created_at")
        # Pseudo-confidence without a real similarity score
        confidence = round(min(100.0, 50.0 + (usage_count * 2)), 2)

        ranked.append({
            "id": doc_id,
            "solution": doc.get("solution", ""),
            "similarity": 50.0,
            "usage_count": usage_count,
            "confidence": confidence,
            "version": version,
            "updated_at": (
                updated_at.isoformat()
                if hasattr(updated_at, "isoformat")
                else str(updated_at or "")
            ),
        })

    return ranked
