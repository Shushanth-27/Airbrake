"""Embeddings via Gemini Embedding API.

Replaces SentenceTransformers + FAISS with a lightweight call to
google-generativeai. Falls back to a zero-vector on any error so the
rest of the pipeline can continue gracefully.
"""

from __future__ import annotations

import os
from typing import List

import numpy as np

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "models/text-embedding-004")
EMBEDDING_DIM = 768  # text-embedding-004 output dimension


def create_embedding(text: str) -> List[float]:
    """Return a normalised embedding vector for *text* using Gemini.

    Returns a zero-vector of length EMBEDDING_DIM if the API call fails so
    callers never have to handle None.
    """
    if not isinstance(text, str) or not text.strip():
        return [0.0] * EMBEDDING_DIM

    try:
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=GEMINI_API_KEY)
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text.strip(),
            task_type="RETRIEVAL_DOCUMENT",
        )
        vec = np.array(result["embedding"], dtype=np.float64)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()
    except Exception as exc:
        print(f"[Embeddings] Gemini embedding failed: {exc}")
        return [0.0] * EMBEDDING_DIM


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Return cosine similarity between two pre-normalised vectors."""
    va = np.array(a, dtype=np.float64)
    vb = np.array(b, dtype=np.float64)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))
