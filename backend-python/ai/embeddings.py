"""Sentence-transformer embeddings — lazy singleton to conserve memory."""

from __future__ import annotations

import os
from typing import List

# Use env var to allow swapping to a smaller model; default is paraphrase-MiniLM-L3-v2
# which is ~60 MB vs all-MiniLM-L6-v2 ~90 MB, saving ~30 MB on free tier.
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "paraphrase-MiniLM-L3-v2")

_model = None  # loaded on first use


def get_embedding_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def create_embedding(text: str) -> List[float]:
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Text must be a non-empty string")
    embedding = get_embedding_model().encode(text, normalize_embeddings=True)
    return embedding.astype(float).tolist()
