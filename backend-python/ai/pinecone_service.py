"""Pinecone wrapper — upsert, delete, and query vectors.

SDK version: pinecone >= 5.0.0

Critical SDK note (v5 breaking change)
───────────────────────────────────────
In Pinecone SDK v5 the host MUST be passed to Index(), not to Pinecone().
The Pinecone() constructor accepts ONLY api_key (and optional proxy/timeout
settings).  Passing host= to Pinecone() is silently ignored or causes a
TypeError in some patch versions.

Correct usage:
    pc = Pinecone(api_key="...")          # constructor: api_key only
    index = pc.Index(host="https://...")  # target by host (recommended for prod)
    # OR
    index = pc.Index(name="my-index")     # target by name (makes extra API call)

PINECONE_HOST takes priority when set because it avoids the describe_index
round-trip and directly connects to the index host shown in the dashboard.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ── Environment helpers ───────────────────────────────────────────────────────

def _get_pinecone_api_key() -> str:
    return os.getenv("PINECONE_API_KEY", "")


def _get_pinecone_index() -> str:
    return os.getenv("PINECONE_INDEX", "airbrake-rag")


def _get_pinecone_host() -> Optional[str]:
    return os.getenv("PINECONE_HOST") or None


def _get_pinecone_environment() -> Optional[str]:
    return os.getenv("PINECONE_ENVIRONMENT") or None


def _masked_key(key: str) -> str:
    """Return last 4 chars of API key, rest masked — safe to log."""
    if not key:
        return "(not set)"
    return f"{'*' * (len(key) - 4)}{key[-4:]}" if len(key) > 4 else "****"


# ── Client factory ────────────────────────────────────────────────────────────

def _get_pinecone_client():
    """Return a configured Pinecone client (control-plane only, no host).

    The SDK v5 Pinecone() constructor accepts ONLY api_key.
    Host is passed to Index() separately — see _get_index().
    """
    try:
        from pinecone import Pinecone  # type: ignore
    except Exception as exc:
        raise RuntimeError(
            f"pinecone package is not installed — "
            f"run: pip install 'pinecone>=5.0.0': {exc}"
        ) from exc

    api_key = _get_pinecone_api_key()
    if not api_key:
        raise RuntimeError("PINECONE_API_KEY is not configured")

    # Constructor takes api_key ONLY in SDK v5.
    # Do NOT pass host here — it belongs on Index().
    return Pinecone(api_key=api_key)


def _get_index():
    """Return a ready-to-use Index object targeting the configured host/name.

    Strategy (SDK v5, production-recommended):
      1. If PINECONE_HOST is set → pc.Index(host=host)
         Direct connection, no extra API call, zero latency overhead.
      2. Else if PINECONE_INDEX is set → pc.Index(name=index_name)
         SDK performs a describe_index call to discover the host.
         Slower but works without knowing the host URL.
    """
    pc = _get_pinecone_client()
    host = _get_pinecone_host()
    index_name = _get_pinecone_index()

    logger.info(
        "[Pinecone] Targeting index: name=%r host=%s api_key=%s",
        index_name,
        host or "(not set — will use name lookup)",
        _masked_key(_get_pinecone_api_key()),
    )

    if host:
        # Recommended for production: direct to the host shown in dashboard.
        # pc.Index(host=host) does NOT make an extra API call.
        return pc.Index(host=host)
    else:
        # Fallback: discover host from index name via describe_index API call.
        if not index_name:
            raise RuntimeError("Neither PINECONE_HOST nor PINECONE_INDEX is configured")
        return pc.Index(name=index_name)


# ── Public API ────────────────────────────────────────────────────────────────

def upsert_vector(
    solution_id: str,
    embedding: List[float],
    project_name: str,
    error_hash: str,
    version: int,
) -> bool:
    """Upsert one solution vector into Pinecone.  Never raises — always returns bool.

    Logs every stage:  START → embedding check → connect → upsert → verify
    """
    logger.info(
        "[Pinecone] START upsert — solution_id=%r project=%r version=%d",
        solution_id, project_name, version,
    )

    # ── Env diagnostics ───────────────────────────────────────────────────────
    api_key    = _get_pinecone_api_key()
    index_name = _get_pinecone_index()
    host       = _get_pinecone_host()
    logger.info(
        "[Pinecone] Config — PINECONE_INDEX=%r PINECONE_HOST=%s PINECONE_API_KEY=%s",
        index_name,
        host or "(not set)",
        _masked_key(api_key),
    )

    try:
        # ── Validate inputs ───────────────────────────────────────────────────
        if not api_key:
            logger.error("[Pinecone] FAILED — PINECONE_API_KEY is not set")
            return False

        if not index_name and not host:
            logger.error("[Pinecone] FAILED — PINECONE_INDEX and PINECONE_HOST are both unset")
            return False

        if not isinstance(embedding, list):
            logger.error(
                "[Pinecone] FAILED — embedding is not a list, got %s",
                type(embedding).__name__,
            )
            return False

        emb_len = len(embedding)
        logger.info("[Pinecone] Embedding length=%d (expected 1024)", emb_len)

        if emb_len != 1024:
            logger.error(
                "[Pinecone] FAILED — embedding length %d != 1024. "
                "Check BEDROCK_EMBEDDING_DIMENSIONS env var.",
                emb_len,
            )
            return False

        # ── Metadata — verify JSON-serialisable ───────────────────────────────
        metadata: Dict[str, Any] = {
            "solution_id": str(solution_id),
            "project_name": str(project_name),
            "error_hash": str(error_hash),
            "version": int(version),
        }
        logger.info("[Pinecone] Metadata: %s", metadata)

        # ── Connect ───────────────────────────────────────────────────────────
        logger.info("[Pinecone] Connecting to index...")
        index = _get_index()
        logger.info("[Pinecone] Connected. Upserting vector id=%r...", solution_id)

        # ── Upsert ────────────────────────────────────────────────────────────
        upsert_response = index.upsert(
            vectors=[{
                "id":       solution_id,
                "values":   embedding,
                "metadata": metadata,
            }],
        )
        logger.info(
            "[Pinecone] Upsert response: %s",
            upsert_response,
        )

        # ── Verify: describe_index_stats ──────────────────────────────────────
        try:
            stats = index.describe_index_stats()
            total = (
                stats.get("total_vector_count")
                if isinstance(stats, dict)
                else getattr(stats, "total_vector_count", None)
            )
            namespaces = (
                stats.get("namespaces")
                if isinstance(stats, dict)
                else getattr(stats, "namespaces", {})
            )
            logger.info(
                "[Pinecone] Index stats after upsert: total_vector_count=%s namespaces=%s",
                total,
                namespaces,
            )
        except Exception as stats_exc:
            logger.warning(
                "[Pinecone] describe_index_stats failed (non-fatal): %s", stats_exc
            )

        # ── Verify: fetch the vector back ─────────────────────────────────────
        try:
            fetch_result = index.fetch(ids=[solution_id])
            fetched_vectors = (
                fetch_result.get("vectors", {})
                if isinstance(fetch_result, dict)
                else getattr(fetch_result, "vectors", {})
            )
            if solution_id in fetched_vectors:
                logger.info(
                    "[Pinecone] Fetch SUCCESS — vector %r exists in index", solution_id
                )
            else:
                logger.warning(
                    "[Pinecone] Fetch returned empty for id=%r — "
                    "vector may not be visible yet (eventual consistency)",
                    solution_id,
                )
        except Exception as fetch_exc:
            logger.warning(
                "[Pinecone] fetch verification failed (non-fatal): %s", fetch_exc
            )

        logger.info(
            "[Pinecone] SUCCESS upsert — solution_id=%r project=%r version=%d",
            solution_id, project_name, version,
        )
        return True

    except Exception as exc:
        logger.exception(
            "[Pinecone] FAILED upsert — solution_id=%r error=%s: %s",
            solution_id,
            type(exc).__name__,
            exc,
        )
        return False


def delete_vector(solution_id: str) -> bool:
    """Delete one solution vector from Pinecone.  Never raises."""
    logger.info("[Pinecone] START delete — solution_id=%r", solution_id)
    try:
        index = _get_index()
        index.delete(ids=[solution_id])
        logger.info("[Pinecone] SUCCESS delete — solution_id=%r", solution_id)
        return True
    except Exception as exc:
        logger.exception(
            "[Pinecone] FAILED delete — solution_id=%r error=%s: %s",
            solution_id,
            type(exc).__name__,
            exc,
        )
        return False


def query_similar(
    solution_id: Optional[str],
    embedding: List[float],
    project_name: Optional[str],
    limit: int = 5,
    error_hash: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Query Pinecone for vectors similar to the supplied embedding.  Never raises."""
    logger.info(
        "[Pinecone] START query — project=%r limit=%d",
        project_name, limit,
    )
    try:
        api_key    = _get_pinecone_api_key()
        index_name = _get_pinecone_index()
        host       = _get_pinecone_host()

        if not api_key or (not index_name and not host):
            logger.warning("[Pinecone] query skipped — missing API key or index config")
            return []

        index = _get_index()

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

        matches = (
            results.get("matches", [])
            if isinstance(results, dict)
            else getattr(results, "matches", []) or []
        )

        logger.info(
            "[Pinecone] SUCCESS query — project=%r matches=%d",
            project_name, len(matches),
        )
        return matches

    except Exception as exc:
        logger.exception(
            "[Pinecone] FAILED query — project=%r error=%s: %s",
            project_name,
            type(exc).__name__,
            exc,
        )
        return []
