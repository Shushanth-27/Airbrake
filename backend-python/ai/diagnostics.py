"""Diagnostic helpers for AI runtime health and import safety."""

from __future__ import annotations

import importlib
import os
import traceback
from typing import Any, Dict, Optional


def _safe_import(module_name: str) -> Dict[str, Any]:
    try:
        importlib.import_module(module_name)
        return {"available": True, "error": None, "traceback": None}
    except Exception as exc:
        return {
            "available": False,
            "error": f"{type(exc).__name__}: {exc}",
            "traceback": traceback.format_exc(),
        }


def get_ai_diagnostics() -> Dict[str, Any]:
    imports = {
        "ai.recommendations": _safe_import("ai.recommendations"),
        "ai.knowledge_base": _safe_import("ai.knowledge_base"),
        "ai.embeddings": _safe_import("ai.embeddings"),
        "ai.llm": _safe_import("ai.llm"),
        "ai.bedrock_embeddings": _safe_import("ai.bedrock_embeddings"),
        "ai.bedrock_llm": _safe_import("ai.bedrock_llm"),
        "ai.pinecone_service": _safe_import("ai.pinecone_service"),
    }

    bedrock_config = {
        "region": os.getenv("BEDROCK_REGION") or os.getenv("AWS_REGION") or "us-east-1",
        "embedding_model_id": os.getenv("BEDROCK_EMBEDDING_MODEL_ID") or os.getenv("BEDROCK_TITAN_MODEL_ID") or "amazon.titan-embed-text-v2:0",
        "nova_model_id": os.getenv("BEDROCK_NOVA_MODEL_ID") or os.getenv("BEDROCK_MODEL_ID") or "amazon.nova-lite-v1:0",
        "embedding_dimensions": int(os.getenv("BEDROCK_EMBEDDING_DIMENSIONS", "1024")),
        "configured": bool(os.getenv("BEDROCK_REGION") or os.getenv("AWS_REGION") or os.getenv("BEDROCK_EMBEDDING_MODEL_ID") or os.getenv("BEDROCK_NOVA_MODEL_ID") or os.getenv("BEDROCK_MODEL_ID")),
    }

    pinecone_config = {
        "api_key_configured": bool(os.getenv("PINECONE_API_KEY")),
        "host_configured": bool(os.getenv("PINECONE_HOST")),
        "index": os.getenv("PINECONE_INDEX") or "airbrake-rag",
        "namespace": os.getenv("PINECONE_NAMESPACE") or "default",
        "environment": os.getenv("PINECONE_ENVIRONMENT") or "",
    }

    required_bedrock_vars = [
        "BEDROCK_REGION",
        "BEDROCK_EMBEDDING_MODEL_ID",
        "BEDROCK_NOVA_MODEL_ID",
    ]
    required_pinecone_vars = [
        "PINECONE_API_KEY",
        "PINECONE_INDEX",
    ]
    missing_bedrock = [name for name in required_bedrock_vars if not os.getenv(name)]
    missing_pinecone = [name for name in required_pinecone_vars if not os.getenv(name)]

    aurora_status = {"available": False, "error": None, "traceback": None}
    try:
        import db as _db
        try:
            conn = _db.get_connection()
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
            aurora_status = {"available": True, "error": None, "traceback": None}
        except Exception as exc:
            aurora_status = {
                "available": False,
                "error": f"{type(exc).__name__}: {exc}",
                "traceback": traceback.format_exc(),
            }
    except Exception as exc:
        aurora_status = {
            "available": False,
            "error": f"{type(exc).__name__}: {exc}",
            "traceback": traceback.format_exc(),
        }

    bedrock_connected = bool(imports.get("ai.bedrock_embeddings", {}).get("available", False) and imports.get("ai.bedrock_llm", {}).get("available", False))
    pinecone_connected = bool(imports.get("ai.pinecone_service", {}).get("available", False) and pinecone_config["api_key_configured"])

    return {
        "status": "degraded" if not all(item.get("available", False) for item in imports.values()) else "ok",
        "imports": imports,
        "bedrock": {
            "connected": bedrock_connected,
            "model": bedrock_config["embedding_model_id"],
            "embedding_dimension": bedrock_config["embedding_dimensions"],
            "details": bedrock_config,
        },
        "pinecone": {
            "connected": pinecone_connected,
            "index": pinecone_config["index"],
            "namespace": pinecone_config["namespace"],
            "record_count": None,
            "last_error": None,
            "details": pinecone_config,
        },
        "aurora": {"connected": aurora_status["available"], "error": aurora_status.get("error"), "traceback": aurora_status.get("traceback")},
        "environment": {
            "region": bedrock_config["region"],
            "embedding_model": bedrock_config["embedding_model_id"],
            "nova_model": bedrock_config["nova_model_id"],
            "pinecone_index": pinecone_config["index"],
        },
        "configuration": {
            "bedrock_configured": bedrock_config["configured"],
            "pinecone_configured": pinecone_config["api_key_configured"],
            "missing_bedrock_variables": missing_bedrock,
            "missing_pinecone_variables": missing_pinecone,
        },
    }
