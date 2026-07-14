"""Local ChromaDB wrapper for storing knowledge-base vectors."""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import chromadb


def _resolve_persist_directory() -> str:
    """Return a local directory that will persist Chroma data."""
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    persist_dir = os.path.join(backend_dir, ".chroma_db")
    os.makedirs(persist_dir, exist_ok=True)
    return persist_dir


_client = chromadb.PersistentClient(path=_resolve_persist_directory())


def get_collection(name: str = "knowledge_base"):
    """Return the persistent collection used for knowledge-base vectors."""
    return _client.get_or_create_collection(name=name)


def add_document(
    doc_id: str,
    document: str,
    metadata: Optional[Dict[str, Any]] = None,
    embedding: Optional[List[float]] = None,
) -> None:
    """Store a document and embedding in ChromaDB."""
    collection = get_collection()
    collection.add(
        ids=[doc_id],
        documents=[document],
        metadatas=[metadata or {}],
        embeddings=[embedding] if embedding is not None else None,
    )


def update_document(
    doc_id: str,
    document: str,
    metadata: Optional[Dict[str, Any]] = None,
    embedding: Optional[List[float]] = None,
) -> None:
    """Replace an existing Chroma document entry with the latest version."""
    collection = get_collection()
    try:
        collection.delete(ids=[doc_id])
    except Exception:
        pass
    collection.add(
        ids=[doc_id],
        documents=[document],
        metadatas=[metadata or {}],
        embeddings=[embedding] if embedding is not None else None,
    )


def delete_document(doc_id: str) -> None:
    """Remove a document from ChromaDB by its id."""
    collection = get_collection()
    try:
        collection.delete(ids=[doc_id])
    except Exception:
        pass


def query_collection(
    query_embedding: List[float],
    k: int = 5,
    where: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Query the Chroma collection for the nearest neighbors.

    Args:
        query_embedding: The query vector.
        k: Number of results to return.
        where: Optional ChromaDB metadata filter dict, e.g. {"error_hash": {"$eq": "abc"}}.
    """
    collection = get_collection()
    kwargs: Dict[str, Any] = {"query_embeddings": [query_embedding], "n_results": k}
    if where:
        kwargs["where"] = where
    return collection.query(**kwargs)
