"""FAISS vector index — singleton that auto-builds from Aurora DSQL on startup."""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy imports so the module can be imported without crashing when faiss is
# not yet installed (avoids breaking the test suite).
# ---------------------------------------------------------------------------
try:
    import faiss as _faiss  # type: ignore
except ImportError as exc:
    raise ImportError("faiss-cpu must be installed: pip install faiss-cpu") from exc

FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "faiss.index")
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output dimension


class FaissIndex:
    """In-memory FAISS flat L2 index with parallel id→metadata mapping."""

    def __init__(self) -> None:
        self._index: Any = _faiss.IndexFlatIP(EMBEDDING_DIM)  # inner-product (cosine on normalised)
        self._ids: List[str] = []  # position → document uuid
        self._metadata: List[Dict[str, Any]] = []
        self._loaded = False

    def _rebuild_from_aurora(self) -> None:
        """Clear the index and rebuild from all Aurora knowledge_base rows."""
        from ai.embeddings import create_embedding
        from db import query

        logger.info("Rebuilding FAISS index from Aurora DSQL…")
        self._index = _faiss.IndexFlatIP(EMBEDDING_DIM)
        self._ids = []
        self._metadata = []

        rows = query(
            """
            SELECT kb.id, kb.solution, kb.embedding, pr.project_name, pr.error_hash
            FROM knowledge_base kb
            JOIN project_results pr ON kb.project_result_id = pr.id
            """
        )
        vectors: List[List[float]] = []

        for row in rows:
            doc_id = str(row.get("id") or "")
            solution = str(row.get("solution") or "").strip()
            if not doc_id or not solution:
                continue

            emb = row.get("embedding")
            if not emb or len(emb) != EMBEDDING_DIM:
                try:
                    emb = create_embedding(solution)
                except Exception:
                    continue

            self._ids.append(doc_id)
            self._metadata.append({
                "id": doc_id,
                "project_name": row.get("project_name"),
                "error_hash": row.get("error_hash"),
            })
            vectors.append(emb)

        if vectors:
            matrix = np.array(vectors, dtype=np.float32)
            self._index.add(matrix)  # type: ignore[attr-defined]

        logger.info("FAISS index built: %d vectors", self._index.ntotal)
        self._save()

    def _save(self) -> None:
        try:
            _faiss.write_index(self._index, FAISS_INDEX_PATH)
        except Exception as exc:
            logger.warning("Could not save FAISS index: %s", exc)

    def _load_or_rebuild(self) -> None:
        if self._loaded:
            return
        if os.path.exists(FAISS_INDEX_PATH):
            try:
                self._index = _faiss.read_index(FAISS_INDEX_PATH)
                logger.info("FAISS index loaded from disk: %d vectors", self._index.ntotal)
            except Exception as exc:
                logger.warning("Failed to load FAISS index (%s), rebuilding…", exc)
                self._rebuild_from_aurora()
        else:
            self._rebuild_from_aurora()
        self._loaded = True

    def add(self, doc_id: str, embedding: List[float]) -> None:
        self._load_or_rebuild()
        vec = np.array([embedding], dtype=np.float32)
        self._index.add(vec)  # type: ignore[attr-defined]
        self._ids.append(doc_id)
        self._metadata.append({"id": doc_id})
        self._save()

    def update(self, doc_id: str, embedding: List[float]) -> None:
        """Remove old vector (if present) and add new one."""
        self._load_or_rebuild()
        self.remove(doc_id)
        self.add(doc_id, embedding)

    def remove(self, doc_id: str) -> None:
        self._load_or_rebuild()
        if doc_id not in self._ids:
            return
        self._rebuild_from_aurora()

    def query(
        self,
        query_embedding: List[float],
        k: int = 5,
        error_hash: Optional[str] = None,
        project_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Return top-k results as list of {id, score} dicts, optionally filtered."""
        self._load_or_rebuild()

        if self._index.ntotal == 0:  # type: ignore[attr-defined]
            return []

        actual_k = min(k * 4, self._index.ntotal)  # over-fetch to allow filtering
        vec = np.array([query_embedding], dtype=np.float32)
        scores, indices = self._index.search(vec, actual_k)  # type: ignore[attr-defined]

        results: List[Dict[str, Any]] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self._ids):
                continue
            doc_id = self._ids[idx]
            results.append({"id": doc_id, "score": float(score)})

        if error_hash or project_name:
            filtered: List[Dict[str, Any]] = []
            for r in results:
                meta = self._metadata[self._ids.index(r["id"])] if r["id"] in self._ids else {}
                if error_hash and str(meta.get("error_hash") or "") != str(error_hash):
                    continue
                if project_name:
                    rp = str(meta.get("project_name") or "").strip().lower()
                    if rp and rp != str(project_name).strip().lower():
                        continue
                filtered.append(r)
                if len(filtered) >= k:
                    break
            return filtered

        return results[:k]

    def ensure_loaded(self) -> None:
        """No-op — index loads lazily on first query to save memory."""
        pass


# Singleton
_faiss_index: Optional[FaissIndex] = None


def get_faiss_index() -> FaissIndex:
    global _faiss_index
    if _faiss_index is None:
        _faiss_index = FaissIndex()
    return _faiss_index
