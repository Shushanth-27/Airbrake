"""Knowledge base helpers for solution versioning, metrics, and FAISS updates."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional, Tuple

from ai.embeddings import create_embedding
from ai.faiss_index import get_faiss_index
from db import execute, execute_returning, query


def calculate_confidence(usage_count: int) -> float:
    return round(min(100.0, 50.0 + float(usage_count) * 2.0), 2)


def _get_project_result(error_hash: str, project_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conditions = ["(error_hash = %s OR MD5(LOWER(TRIM(error))) = %s)"]
    params: List[Any] = [error_hash, error_hash]
    if project_name:
        conditions.insert(0, "LOWER(project_name) = LOWER(%s)")
        params.insert(0, project_name)

    rows = query(
        f"""
        SELECT id, project_name, error_hash
        FROM project_results
        WHERE {' AND '.join(conditions)}
        LIMIT 1
        """,
        tuple(params),
    )
    return rows[0] if rows else None


def _find_solution(solution_id: str) -> Optional[Dict[str, Any]]:
    rows = query(
        "SELECT kb.*, pr.error_hash, pr.project_name FROM knowledge_base kb "
        "JOIN project_results pr ON kb.project_result_id = pr.id "
        "WHERE kb.id = %s",
        (solution_id,),
    )
    return rows[0] if rows else None


def insert_solution(
    error_hash: str,
    solution: str,
    created_by: str = 'developer',
    project_name: Optional[str] = None,
    base_solution_id: Optional[str] = None,
) -> Dict[str, Any]:
    project = _get_project_result(error_hash, project_name)
    if not project:
        raise ValueError('No matching project_result found')

    project_result_id = project['id']
    version_rows = query(
        'SELECT MAX(version) AS max_version FROM knowledge_base WHERE project_result_id = %s',
        (project_result_id,),
    )
    version = int(version_rows[0]['max_version'] or 0) + 1
    usage_count = 1
    confidence_score = calculate_confidence(usage_count)

    embedding = None
    try:
        embedding = create_embedding(solution)
    except Exception:
        pass

    row = execute_returning(
        """
        INSERT INTO knowledge_base
        (id, project_result_id, solution, created_by, created_at, usage_count, version, confidence_score, embedding)
        VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s, %s)
        RETURNING *
        """,
        (
            str(uuid.uuid4()),
            project_result_id,
            solution,
            created_by,
            usage_count,
            version,
            confidence_score,
            embedding,
        ),
    )

    if row and embedding is not None:
        try:
            get_faiss_index().add(row['id'], embedding)
        except Exception:
            pass

    return row


def increment_usage(solution_id: str) -> Dict[str, Any]:
    existing = _find_solution(solution_id)
    if not existing:
        raise ValueError('Solution not found')

    usage_count = int(existing.get('usage_count') or 0) + 1
    confidence_score = calculate_confidence(usage_count)

    row = execute_returning(
        'UPDATE knowledge_base SET usage_count = %s, confidence_score = %s WHERE id = %s RETURNING *',
        (usage_count, confidence_score, solution_id),
    )
    if not row:
        raise ValueError('Solution not found')
    return row


def delete_solution_version(solution_id: str) -> int:
    count = execute('DELETE FROM knowledge_base WHERE id = %s', (solution_id,))
    if count > 0:
        try:
            get_faiss_index().remove(solution_id)
        except Exception:
            pass
    return count


def get_top_solutions(
    error_hash: str,
    project_name: Optional[str] = None,
    limit: int = 5,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    conditions = ["(pr.error_hash = %s OR MD5(LOWER(TRIM(pr.error))) = %s)"]
    params: List[Any] = [error_hash, error_hash]
    if project_name:
        conditions.insert(0, "LOWER(pr.project_name) = LOWER(%s)")
        params.insert(0, project_name)

    rows = query(
        f"""
        SELECT kb.id, kb.solution, kb.created_by, kb.created_at, kb.usage_count,
               kb.confidence_score, kb.version, kb.project_result_id
        FROM knowledge_base kb
        JOIN project_results pr ON kb.project_result_id = pr.id
        WHERE {' AND '.join(conditions)}
        ORDER BY kb.confidence_score DESC, kb.usage_count DESC, kb.created_at DESC
        LIMIT %s OFFSET %s
        """,
        tuple(params + [limit, offset]),
    )

    total_rows = query(
        f"""
        SELECT COUNT(*) AS total
        FROM knowledge_base kb
        JOIN project_results pr ON kb.project_result_id = pr.id
        WHERE {' AND '.join(conditions)}
        """,
        tuple(params),
    )
    total = int(total_rows[0]['total']) if total_rows else 0
    return rows, total


def get_solution_versions(solution_id: str) -> List[Dict[str, Any]]:
    row = _find_solution(solution_id)
    if not row:
        return []

    versions = query(
        """
        SELECT id, solution, created_by, created_at, usage_count, confidence_score, version
        FROM knowledge_base
        WHERE project_result_id = %s
        ORDER BY version DESC
        """,
        (row['project_result_id'],),
    )
    return versions


def get_solution_by_id(solution_id: str) -> Optional[Dict[str, Any]]:
    return _find_solution(solution_id)
