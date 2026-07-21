"""Minimal Pinecone wrapper used only for semantic retrieval."""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def _get_pinecone_api_key() -> str:
    return os.getenv("PINECONE_API_KEY", "")


def _get_pinecone_index() -> str:
    return os.getenv("PINECONE_INDEX", "airbrake-rag")


def _get_pinecone_host() -> Optional[str]:
    return os.getenv("PINECONE_HOST") or None


def _get_pinecone_environment() -> Optional[str]:
    return os.getenv("PINECONE_ENVIRONMENT") or None


def _get_client():
    try:
        from pinecone import Pinecone  # type: ignore
    except Exception as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(f"pinecone package is not installed: {exc}") from exc

    api_key = _get_pinecone_api_key()
    if not api_key:
        raise RuntimeError("PINECONE_API_KEY is not configured")

    kwargs: Dict[str, Any] = {"api_key": api_key}
    host = _get_pinecone_host()
    if host:
        kwargs["host"] = host
    else:
        environment = _get_pinecone_environment()
        if environment:
            kwargs["environment"] = environment
    return Pinecone(**kwargs)


def upsert_vector(solution_id: str, embedding: List[float], project_name: str, error_hash: str, version: int) -> bool:
    """Best-effort Pinecone upsert. Never fail the main save flow."""
    try:
        api_key = _get_pinecone_api_key()
        index_name = _get_pinecone_index()
        print(f"[Pinecone] Connecting index={index_name} ...")
        if not api_key or not index_name:
            print("[Pinecone] FAILED — API key or index not configured")
            return False
        if not isinstance(embedding, list) or len(embedding) != 1024:
            raise ValueError(
                f"Pinecone upsert rejected — embedding must be length 1024, got {len(embedding) if isinstance(embedding, list) else 'non-list'}"
            )
        client = _get_client()
        index = client.Index(index_name)
        print(f"[Pinecone] Upserting solution_id={solution_id} version={version} ...")
        index.upsert(
            vectors=[{
                "id": solution_id,
                "values": embedding,
                "metadata": {
                    "solution_id": solution_id,
                    "project_name": project_name,
                    "error_hash": error_hash,
                    "version": version,
                },
            }],
        )
        print(f"[Pinecone] SUCCESS solution_id={solution_id} version={version}")
        return True
    except Exception as exc:
        print(f"[Pinecone] FAILED reason={type(exc).__name__}: {exc}")
        logger.exception("Pinecone upsert failed — component=pinecone_service operation=upsert")
        return False


def delete_vector(solution_id: str) -> bool:
    try:
        api_key = _get_pinecone_api_key()
        index_name = _get_pinecone_index()
        if not api_key or not index_name:
            return False
        client = _get_client()
        index = client.Index(index_name)
        index.delete(ids=[solution_id])
        return True
    except Exception as exc:
        logger.exception("Pinecone delete failed — component=pinecone_service operation=delete")
        return False


def query_similar(
    solution_id: Optional[str],
    embedding: List[float],
    project_name: Optional[str],
    limit: int = 5,
    error_hash: Optional[str] = None,
) -> List[Dict[str, Any]]:
    try:
        api_key = _get_pinecone_api_key()
        index_name = _get_pinecone_index()
        if not api_key or not index_name:
            return []
        client = _get_client()
        index = client.Index(index_name)
        filter_kwargs: Dict[str, Any] = {}
        if project_name or error_hash:
            filter_conditions: Dict[str, Any] = {}
            if project_name:
                filter_conditions["project_name"] = project_name
            if error_hash:
                filter_conditions["error_hash"] = error_hash
            filter_kwargs["filter"] = filter_conditions
        results = index.query(
            vector=embedding,
            top_k=limit,
            include_metadata=True,
            include_values=True,
            **filter_kwargs,
        )
        return results.get("matches", []) if isinstance(results, dict) else []
    except Exception as exc:
        logger.exception("Pinecone query failed — component=pinecone_service operation=query")
        return []
