import hashlib
import re
from typing import Optional


def normalize_project_name(project_name: Optional[str]) -> str:
    if not project_name:
        return ''
    normalized = project_name.strip().lower().replace('_', ' ')
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized


def _normalize_error_text(error_text: Optional[str], error_detail: Optional[str] = None) -> str:
    raw = (error_detail or error_text or '').strip()
    if not raw:
        return ''
    short = raw
    if '\n' in raw:
        lines = [line.strip() for line in raw.splitlines() if line.strip()]
        if lines:
            short = lines[-1]
    short = short.split(':', 1)[0].strip()
    short = re.sub(r'\s+', ' ', short).lower().strip()
    return short


def derive_error_hash(error_text: Optional[str], error_detail: Optional[str] = None) -> str:
    normalized = _normalize_error_text(error_text, error_detail)
    if not normalized:
        return ''
    return hashlib.md5(normalized.encode('utf-8')).hexdigest()


def _is_error_hash(value: str) -> bool:
    return bool(re.fullmatch(r'[0-9a-fA-F]{32}', value.strip()))


def build_error_hash_candidates(error_text: Optional[str], error_detail: Optional[str] = None) -> list[str]:
    raw = (error_detail or error_text or '').strip()
    if not raw:
        return []
    if _is_error_hash(raw):
        return [raw.lower()]

    candidates: list[str] = []
    for variant in {
        raw,
        raw.lower(),
        re.sub(r'\s+', ' ', raw).strip(),
        re.sub(r'\s+', ' ', raw).strip().lower(),
        _normalize_error_text(error_text, error_detail),
    }:
        if variant:
            candidates.append(hashlib.md5(variant.encode('utf-8')).hexdigest())

    derived = derive_error_hash(error_text, error_detail)
    if derived:
        candidates.append(derived)
    return list(dict.fromkeys(candidates))


def build_lookup_hash_candidates(error_hash: Optional[str], error_text: Optional[str] = None, error_detail: Optional[str] = None) -> list[str]:
    """Build lookup candidates for break-detail and solution lookups.

    This preserves direct hash values (e.g. an already-derived error hash) and also
    adds derived hash candidates from the error text/detail when available.
    """
    candidates: list[str] = []
    if error_hash:
        normalized_hash = str(error_hash).strip()
        if normalized_hash:
            candidates.append(normalized_hash)

    if error_text or error_detail:
        candidates.extend(build_error_hash_candidates(error_text, error_detail))

    return list(dict.fromkeys(candidates))
