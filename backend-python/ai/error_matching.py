import hashlib
import re
from typing import Optional


def normalize_project_name(project_name: Optional[str]) -> str:
    if not project_name:
        return ''
    normalized = project_name.strip().lower().replace('_', ' ')
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized


def normalize_error_for_lookup(error_message: Optional[str]) -> str:
    """Produce a canonical, stable string for grouping errors into solution groups.

    Two occurrences of the same error — regardless of which specific file path,
    UUID, line number, or timestamp appeared in the message — will produce the
    same output.  This is the ONLY function that should be used to derive the
    solution-group key.

    Normalisation steps (order matters):
      1. lowercase + strip
      2. remove ISO-8601 / common timestamps
      3. remove UUIDs (8-4-4-4-12 hex)
      4. remove hex memory addresses  (0x...)
      5. remove Windows/POSIX file paths
      6. remove standalone integers / floats that look like IDs or line numbers
      7. collapse multiple whitespace to single space
      8. strip leading/trailing punctuation that doesn't change meaning
    """
    if not error_message:
        return ''

    s = error_message.strip().lower()

    # timestamps  e.g. 2024-01-15T10:30:00Z  or  2024-01-15 10:30:00
    s = re.sub(r'\d{4}-\d{2}-\d{2}[t ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:z|[+-]\d{2}:?\d{2})?', '', s)
    # UUIDs
    s = re.sub(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', '', s)
    # hex addresses  0xDEADBEEF
    s = re.sub(r'\b0x[0-9a-f]+\b', '', s)
    # Windows paths  \\server\share\...  or  C:\Users\...
    s = re.sub(r'(?:\\\\[\w.\-]+\\[\w\s.\-\\]+|[a-z]:\\(?:[\w\s.\-]+\\?)*)', '', s)
    # POSIX paths  /foo/bar/baz.ext
    s = re.sub(r'/(?:[\w.\-]+/)+[\w.\-]*', '', s)
    # standalone numbers that look like line numbers, IDs, error codes after colon
    # keep HTTP-style "400:" prefix — only strip isolated numbers
    s = re.sub(r'(?<!\w)\d{5,}(?!\w)', '', s)   # long numbers (IDs, timestamps)
    s = re.sub(r'\bline\s+\d+\b', '', s)          # "line 42"
    s = re.sub(r'\bcol(?:umn)?\s+\d+\b', '', s)   # "column 7"
    # collapse whitespace
    s = re.sub(r'\s+', ' ', s).strip()
    # strip trailing/leading punctuation  (but keep alphanumeric boundary)
    s = re.sub(r'^[\s:,;.\-–—]+|[\s:,;.\-–—]+$', '', s)

    return s


def derive_solution_group_key(error_message: Optional[str]) -> str:
    """Return the MD5 of normalize_error_for_lookup(error_message).

    This is the canonical key stored in solution rows' error_hash column so
    that all occurrences with the same normalized error share solutions.
    """
    normalized = normalize_error_for_lookup(error_message)
    if not normalized:
        return ''
    return hashlib.md5(normalized.encode('utf-8')).hexdigest()


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
