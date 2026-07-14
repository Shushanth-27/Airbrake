"""Groq LLM helper for AI recommendations and semantic reasoning."""

from __future__ import annotations

import os
import re
from typing import Any, List, Optional

from groq import Groq

_GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
_MODEL_NAME = os.getenv("MODEL_NAME", "llama3-8b-8192")


def _get_client() -> Groq:
    return Groq(api_key=_GROQ_API_KEY)


def _call_groq(prompt: str, timeout: float = 30.0) -> Optional[str]:
    """Call Groq and return the response text, or None on failure."""
    if not _GROQ_API_KEY:
        return None
    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=_MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=256,
        )
        text = response.choices[0].message.content or ""
        return text.strip() or None
    except Exception:
        return None


# Keep the old name so app.py imports don't break
def _call_tinyllama(prompt: str, timeout: float = 60.0) -> Optional[str]:
    """Alias for _call_groq — drop-in replacement."""
    return _call_groq(prompt, timeout=timeout)


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def _fallback_summary(context: Any) -> str:
    if isinstance(context, list) and context:
        first = context[0]
        if isinstance(first, dict):
            sol = first.get("solution") or ""
            usage = first.get("usage_count") or 0
            ver = first.get("version") or 1
            if sol:
                return f'Consider: "{sol}". Used {usage} time(s), v{ver}.'
    return "No similar solution was found."


def generate_suggested_solution(prompt: str, context: Optional[Any] = None) -> str:
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("Prompt must be non-empty")

    if isinstance(context, list):
        solutions_text = "; ".join(
            f'"{i.get("solution", "")} (used {i.get("usage_count", 0)} times, v{i.get("version", 1)})"'
            for i in context[:3]
            if i.get("solution")
        )
    else:
        solutions_text = str(context or "")

    if not solutions_text:
        return "No similar solution was found."

    llm_prompt = (
        "Given these similar solutions from the knowledge base, write a SHORT 1-2 sentence "
        "recommendation for the developer. "
        f"Solutions: {solutions_text}. "
        "Mention the solution text and usage count."
    )
    result = _call_groq(llm_prompt)
    return result or _fallback_summary(context)


def are_solutions_semantically_identical(original: str, edited: str) -> bool:
    """Return True if the two solutions convey the same fix (cosmetic diff only)."""
    original = original.strip()
    edited = edited.strip()
    if original.lower() == edited.lower():
        return True

    prompt = (
        "You are a strict semantic comparator. Answer with exactly one word: YES or NO.\n"
        "Do the following two developer solutions describe the same fix?\n"
        "Only answer YES if the core meaning and steps are identical "
        "(minor wording/punctuation differences are fine).\n"
        "Answer NO if the approach or key details changed.\n\n"
        f"Solution A:\n{original}\n\n"
        f"Solution B:\n{edited}\n\n"
        "Answer (YES or NO):"
    )
    result = _call_groq(prompt, timeout=20.0)
    if result:
        first = result.strip().upper().split()[0] if result.strip() else ""
        return first == "YES"

    def _norm(s: str) -> str:
        return re.sub(r"[^a-z0-9]", "", s.lower())

    return _norm(original) == _norm(edited)


def is_duplicate_solution(existing: str, candidate: str) -> bool:
    """Return True if candidate is effectively the same fix as existing."""
    existing = existing.strip()
    candidate = candidate.strip()
    if existing.lower() == candidate.lower():
        return True

    prompt = (
        "You are a strict duplicate detector. Answer with exactly one word: YES or NO.\n"
        "Do the following two developer solutions represent the same fix?\n"
        "Answer YES if they solve the problem the same way.\n"
        "Answer NO if they use different approaches.\n\n"
        f"Solution A:\n{existing}\n\n"
        f"Solution B:\n{candidate}\n\n"
        "Answer (YES or NO):"
    )
    result = _call_groq(prompt, timeout=20.0)
    if result:
        first = result.strip().upper().split()[0] if result.strip() else ""
        return first == "YES"

    def _norm(s: str) -> str:
        return re.sub(r"[^a-z0-9]", "", s.lower())

    return _norm(existing) == _norm(candidate)
