"""Semantic solution-group matcher — AI-only, project-scoped.

Public interface
────────────────
    find_matching_solution_group(error_message, project_name) -> Optional[str]

Returns the group_key (error_hash column value on solution rows) of an existing
solution group whose root-cause matches the incoming error, or None when no
good match exists.

Design
──────
This is the ONLY place in the codebase that decides whether a new error
belongs to an existing solution group.  Everything else (get_top_solutions,
insert_solution, get_ai_recommendations) calls this function first and falls
through to its own logic only when it returns None.

The implementation is intentionally isolated behind a single function so it can
be swapped for pgvector / OpenSearch / Pinecone vector search later without
touching any other file.  The current implementation uses Nova Lite (LLM) as a
temporary semantic-matching engine.

Workflow
────────
1. Load the distinct solution groups for the project from the DB.
   Each group is represented by its group_key and a representative error label
   (the error text of the most recent log row that uses that key, or the
   solution text itself when no log row is available).
2. If no groups exist → return None immediately (no LLM call needed).
3. Send a structured prompt to Nova Lite asking it to pick the best matching
   group or answer NO_MATCH.
4. Parse the response.  If it names a group_key that actually exists in the DB
   → return that key.  Otherwise → return None.

Failure modes
─────────────
- LLM unavailable: falls through, returns None → callers use their own fallback.
- LLM returns garbage: parse fails, returns None safely.
- DB error: caught, logged, returns None.

Project isolation
─────────────────
Only solution groups belonging to project_name are ever sent to the LLM.
Cross-project leaks are structurally impossible.

Constants (tunable without code changes)
─────────────────────────────────────────
MAX_GROUPS_TO_SEND   max number of groups sent to the LLM in a single call
LLM_MAX_TOKENS       token budget for the LLM response
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Optional

from db import query

logger = logging.getLogger(__name__)

TABLE = "projects_data"

# ── Tunable constants ─────────────────────────────────────────────────────────
MAX_GROUPS_TO_SEND = 30   # LLM context budget: don't send more than this many groups
LLM_MAX_TOKENS     = 128  # the answer is just a key or NO_MATCH — keep it tight


# ── DB helpers ────────────────────────────────────────────────────────────────

def _load_solution_groups(project_name: str) -> List[Dict[str, str]]:
    """Return one entry per distinct solution group for the project.

    Each item:
        {
            "group_key":  str,   # MD5 stored in solution.error_hash
            "label":      str,   # human-readable representative error text
        }

    The label is the solution text of the highest-confidence version in the
    group, truncated to 300 chars.  Using solution text is reliable because:
      - solution rows always have a solution field
      - the correlated log-row lookup via error_hash would always fail (solution
        rows store the group_key, not the occurrence hash, in their error_hash
        column after the group-key migration)

    Ordered by highest confidence DESC, usage DESC so the LLM sees the most
    validated groups within the MAX_GROUPS_TO_SEND budget.
    """
    try:
        rows = query(
            f"""
            SELECT
                error_hash  AS group_key,
                MAX(solution) AS label,
                MAX(confidence_score) AS best_confidence,
                MAX(usage_count)      AS best_usage
            FROM {TABLE}
            WHERE row_type = 'solution'
              AND LOWER(project_name) = LOWER(%s)
              AND error_hash IS NOT NULL
              AND error_hash <> ''
            GROUP BY error_hash
            ORDER BY best_confidence DESC, best_usage DESC
            LIMIT %s
            """,
            (project_name, MAX_GROUPS_TO_SEND),
        )

        groups = []
        for row in rows:
            gk = row.get("group_key")
            if gk:
                groups.append({
                    "group_key": gk,
                    "label":     (row.get("label") or "").strip()[:300],
                })
        return groups

    except Exception as exc:
        logger.exception("[SemanticGroupMatcher] Failed to load solution groups: %s", exc)
        return []


def _valid_group_keys(project_name: str) -> "set[str]":
    """Return the set of all known group_keys for the project (for answer validation)."""
    try:
        rows = query(
            f"SELECT DISTINCT error_hash AS group_key FROM {TABLE} "
            f"WHERE row_type = 'solution' AND LOWER(project_name) = LOWER(%s)",
            (project_name,),
        )
        return {r["group_key"] for r in rows if r.get("group_key")}
    except Exception as exc:
        logger.exception("[SemanticGroupMatcher] Failed to load valid group keys: %s", exc)
        return set()


# ── LLM helpers ───────────────────────────────────────────────────────────────

def _build_prompt(error_message: str, groups: List[Dict[str, str]]) -> str:
    """Build the Nova Lite prompt.

    The groups are listed as numbered items so the LLM can refer to them by
    their group_key.  We keep the prompt short and deterministic (temperature=0).
    """
    group_lines = "\n".join(
        f'{i + 1}. GROUP_KEY={g["group_key"]} | ERROR_EXAMPLE: {g["label"]}'
        for i, g in enumerate(groups)
    )

    return (
        "You are a software error classification assistant.\n\n"
        "INCOMING ERROR:\n"
        f"{error_message}\n\n"
        "EXISTING SOLUTION GROUPS (same project):\n"
        f"{group_lines}\n\n"
        "TASK:\n"
        "Decide whether the INCOMING ERROR is essentially the same root cause as "
        "one of the EXISTING SOLUTION GROUPS above.\n"
        "Ignore differences in: file names, file paths, UUIDs, timestamps, IDs, "
        "line numbers, variable values, and stack trace formatting.\n"
        "Focus only on the underlying error type and root cause.\n\n"
        "RULES:\n"
        "- If there is a clear semantic match, reply with ONLY the exact GROUP_KEY "
        "value of the best match and nothing else.\n"
        "- If no group matches the root cause, reply with exactly: NO_MATCH\n"
        "- Do not explain. Do not add any other text.\n\n"
        "YOUR ANSWER:"
    )


def _call_llm(prompt: str) -> Optional[str]:
    """Call Nova Lite and return the raw text response, or None on failure."""
    try:
        from ai.llm import generate_ai_response
        result = generate_ai_response(prompt, max_tokens=LLM_MAX_TOKENS)
        return result.strip() if result else None
    except Exception as exc:
        logger.exception("[SemanticGroupMatcher] LLM call failed: %s", exc)
        return None


def _parse_response(raw: Optional[str], valid_keys: "set[str]") -> Optional[str]:
    """Extract a valid group_key from the LLM response, or return None.

    Accepts:
    - Exact group_key (32-char hex MD5)
    - "NO_MATCH" or any response that contains it → None
    - Anything else that doesn't match a known key → None (safe fail)
    """
    if not raw:
        return None

    cleaned = raw.strip()

    # Explicit no-match
    if "NO_MATCH" in cleaned.upper():
        return None

    # The answer should be a 32-char hex MD5 — extract it if present
    md5_match = re.search(r"\b([0-9a-f]{32})\b", cleaned.lower())
    if md5_match:
        candidate = md5_match.group(1)
        if candidate in valid_keys:
            logger.info(
                "[SemanticGroupMatcher] LLM matched group_key=%r", candidate
            )
            return candidate
        else:
            logger.warning(
                "[SemanticGroupMatcher] LLM returned unknown key=%r — treating as NO_MATCH",
                candidate,
            )
            return None

    # LLM returned something unexpected
    logger.warning(
        "[SemanticGroupMatcher] Unexpected LLM response=%r — treating as NO_MATCH",
        cleaned[:120],
    )
    return None


# ── Public interface ──────────────────────────────────────────────────────────

def find_matching_solution_group(
    error_message: str,
    project_name: str,
) -> Optional[str]:
    """Return the group_key of the best matching solution group, or None.

    This is the single entry point for AI-based semantic group matching.
    All callers (get_top_solutions, insert_solution, get_ai_recommendations)
    call this first; they fall back to their own logic when it returns None.

    Returns None immediately (no LLM call) when:
    - error_message or project_name is blank
    - no solution groups exist for the project yet
    - the LLM is unavailable
    - the LLM returns NO_MATCH or an unrecognised answer
    """
    if not error_message or not error_message.strip():
        return None
    if not project_name or not project_name.strip():
        return None

    # Load existing groups — fast DB query, no LLM cost
    groups = _load_solution_groups(project_name)
    if not groups:
        logger.info(
            "[SemanticGroupMatcher] No solution groups for project=%r — skipping LLM call",
            project_name,
        )
        return None

    # Build and fire the LLM prompt
    prompt    = _build_prompt(error_message.strip(), groups)
    raw       = _call_llm(prompt)

    # Validate against the real DB keys to prevent hallucinations
    valid_keys = {g["group_key"] for g in groups}
    result    = _parse_response(raw, valid_keys)

    logger.info(
        "[SemanticGroupMatcher] project=%r error_snippet=%r matched_group=%r",
        project_name,
        error_message.strip()[:80],
        result,
    )
    return result
