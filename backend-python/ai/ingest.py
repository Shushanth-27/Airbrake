"""Ingest knowledge-base documents — stores embedding in MongoDB only.

FAISS is skipped on the free Render tier to stay within 512 MB RAM.
The embedding is persisted in MongoDB so a future upgrade to FAISS
or any other vector store can rebuild without re-computing.
"""

from __future__ import annotations

from typing import Any, Dict


def ingest_solution(solution_record: Dict[str, Any]) -> Dict[str, Any]:
    """Persist embedding to MongoDB. No FAISS on free tier."""
    doc_id = str(solution_record.get("id") or solution_record.get("_id") or "")
    solution_text = str(solution_record.get("solution") or "").strip()

    if not doc_id or not solution_text:
        return {"id": doc_id, "solution": solution_text}

    # Optionally store embedding in MongoDB (non-blocking)
    try:
        from ai.embeddings import create_embedding
        from db import knowledge_base
        embedding = create_embedding(solution_text)
        knowledge_base.update_one(
            {"id": doc_id},
            {"$set": {"embedding": embedding}},
        )
    except Exception:
        pass  # Non-critical — retrieval still works via MongoDB filter

    return {"id": doc_id, "solution": solution_text}


def delete_from_index(doc_id: str) -> None:
    """No-op on free tier — no FAISS index to update."""
    pass
