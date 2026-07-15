"""LLM provider with Gemini → Groq → LlamaCloud fallback chain.

Fallback order:
  1. Gemini (google-generativeai)
  2. Groq
  3. LlamaCloud free-tier API  (OpenAI-compatible, base_url = https://api.llama.com/v1)

If every provider fails, a semantic fallback summary is returned from the
top retrieved solution.  The frontend never receives an exception.

Public API (unchanged so app.py / recommendations.py imports still work):
  generate_ai_response(prompt, context)        → str  (canonical)
  generate_suggested_solution(prompt, context) → str  (backward-compat alias)
  are_solutions_semantically_identical(a, b)   → bool
  is_duplicate_solution(existing, candidate)   → bool
"""

from __future__ import annotations

import os
import re
from typing import Any, List, Optional

# ── env vars ──────────────────────────────────────────────────────────────────
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL     = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

GROQ_API_KEY     = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL       = os.getenv("GROQ_MODEL", "llama3-8b-8192")

LLAMA_API_KEY    = os.getenv("LLAMA_API_KEY", "")          # LlamaCloud free-tier key
LLAMA_BASE_URL   = os.getenv("LLAMA_BASE_URL", "https://api.llama.com/v1")
LLAMA_MODEL      = os.getenv("LLAMA_MODEL", "Llama-4-Scout-17B-16E-Instruct")


# ── individual provider calls ─────────────────────────────────────────────────

def _call_gemini(prompt: str, max_tokens: int = 256) -> Optional[str]:
    """Call Gemini Flash. Returns None on any failure."""
    if not GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=0.0,
            ),
        )
        text = response.text or ""
        return text.strip() or None
    except Exception as exc:
        print(f"[LLM] Gemini failed: {exc}")
        return None


def _call_groq(prompt: str, max_tokens: int = 256) -> Optional[str]:
    """Call Groq. Returns None on any failure."""
    if not GROQ_API_KEY:
        return None
    try:
        from groq import Groq  # type: ignore
        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=max_tokens,
        )
        text = response.choices[0].message.content or ""
        return text.strip() or None
    except Exception as exc:
        print(f"[LLM] Groq failed: {exc}")
        return None


def _call_llama(prompt: str, max_tokens: int = 256) -> Optional[str]:
    """Call LlamaCloud free-tier API (OpenAI-compatible).
    Docs: https://llama.developer.meta.com/docs/features/compatibility
    """
    if not LLAMA_API_KEY:
        return None
    try:
        import requests  # already in requirements.txt
        url = f"{LLAMA_BASE_URL.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {LLAMA_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": LLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
            "max_completion_tokens": max_tokens,
            "stream": False,
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"] or ""
        return text.strip() or None
    except Exception as exc:
        print(f"[LLM] LlamaCloud failed: {exc}")
        return None


# ── public fallback chain ─────────────────────────────────────────────────────

def generate_ai_response(
    prompt: str,
    context: Optional[Any] = None,
    max_tokens: int = 256,
) -> str:
    """Try Gemini → Groq → LlamaCloud → semantic fallback summary.

    Never raises. Always returns a human-readable string.
    """
    if not isinstance(prompt, str) or not prompt.strip():
        return _fallback_summary(context)

    result = (
        _call_gemini(prompt, max_tokens)
        or _call_groq(prompt, max_tokens)
        or _call_llama(prompt, max_tokens)
    )
    return result or _fallback_summary(context)


# ── internal helpers ──────────────────────────────────────────────────────────

def _fallback_summary(context: Any) -> str:
    """Plain-text summary from the top solution when every LLM fails."""
    if isinstance(context, list) and context:
        first = context[0]
        if isinstance(first, dict):
            sol   = first.get("solution") or ""
            usage = first.get("usage_count") or 0
            ver   = first.get("version") or 1
            if sol:
                return f'Consider: "{sol}". Used {usage} time(s), v{ver}.'
    return "No similar solution was found."


def _build_recommendation_prompt(error_prompt: str, solutions: List[Any]) -> str:
    solutions_text = "; ".join(
        f'"{s.get("solution", "")} (used {s.get("usage_count", 0)} times, v{s.get("version", 1)})"'
        for s in solutions[:5]
        if s.get("solution")
    )
    return (
        "Given these similar solutions from the knowledge base, write a SHORT 1-2 sentence "
        "recommendation for the developer. "
        f"Error: {error_prompt}. "
        f"Solutions: {solutions_text}. "
        "Be concise and mention the most relevant solution."
    )


def _llm_yes_no(prompt: str) -> Optional[bool]:
    """Return True/False from a YES/NO LLM question, None if every provider fails."""
    result = (
        _call_gemini(prompt, max_tokens=4)
        or _call_groq(prompt, max_tokens=4)
        or _call_llama(prompt, max_tokens=4)
    )
    if result:
        first = result.strip().upper().split()[0] if result.strip() else ""
        return first == "YES"
    return None


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


# ── backward-compatible public functions ──────────────────────────────────────

def generate_suggested_solution(prompt: str, context: Optional[Any] = None) -> str:
    """Alias for generate_ai_response — keeps existing call sites working."""
    if not isinstance(prompt, str) or not prompt.strip():
        return _fallback_summary(context)
    if isinstance(context, list):
        llm_prompt = _build_recommendation_prompt(prompt, context)
    else:
        llm_prompt = prompt
    return generate_ai_response(llm_prompt, context)


def are_solutions_semantically_identical(original: str, edited: str) -> bool:
    original, edited = original.strip(), edited.strip()
    if original.lower() == edited.lower():
        return True
    result = _llm_yes_no(
        "You are a strict semantic comparator. Answer YES or NO.\n"
        "Do these two developer solutions describe the same fix?\n"
        "Only answer YES if the core meaning is identical.\n\n"
        f"Solution A:\n{original}\n\nSolution B:\n{edited}\n\nAnswer:"
    )
    return result if result is not None else (_norm(original) == _norm(edited))


def is_duplicate_solution(existing: str, candidate: str) -> bool:
    existing, candidate = existing.strip(), candidate.strip()
    if existing.lower() == candidate.lower():
        return True
    result = _llm_yes_no(
        "You are a strict duplicate detector. Answer YES or NO.\n"
        "Do these two developer solutions represent the same fix?\n\n"
        f"Solution A:\n{existing}\n\nSolution B:\n{candidate}\n\nAnswer:"
    )
    return result if result is not None else (_norm(existing) == _norm(candidate))
