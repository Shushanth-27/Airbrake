"""
Stack trace parser — extracts file paths, line numbers, and source code context.

Supports:
- Python stack traces (Traceback format)
- JavaScript/TypeScript stack traces (V8, Node.js format)
- Generic error messages with file:line references
"""

import re
from typing import List, Dict, Optional, Any


class StackFrame:
    """Represents a single frame in a stack trace with source code context."""
    
    def __init__(
        self,
        file_path: str,
        line_number: int,
        function_name: Optional[str] = None,
        code_line: Optional[str] = None,
        column: Optional[int] = None,
    ):
        self.file_path = file_path
        self.line_number = line_number
        self.function_name = function_name
        self.code_line = code_line
        self.column = column
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return {
            "file_path": self.file_path,
            "line_number": self.line_number,
            "function_name": self.function_name,
            "code_line": self.code_line,
            "column": self.column,
        }


class ParsedStackTrace:
    """Container for parsed stack trace with structured frames."""
    
    def __init__(self, frames: List[StackFrame], raw_trace: str):
        self.frames = frames
        self.raw_trace = raw_trace
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return {
            "frames": [f.to_dict() for f in self.frames],
            "raw_trace": self.raw_trace,
        }


def parse_python_traceback(traceback_text: str) -> List[StackFrame]:
    """
    Parse Python traceback format.
    
    Example:
        Traceback (most recent call last):
          File "/app/main.py", line 42, in process_data
            result = parse_json(data)
          File "/app/parser.py", line 15, in parse_json
            return json.loads(text)
        ValueError: Invalid JSON
    """
    frames = []
    
    # Pattern: File "path", line N, in function_name
    # Followed by the actual code line
    file_pattern = re.compile(
        r'^\s*File\s+"([^"]+)",\s+line\s+(\d+)(?:,\s+in\s+(.+))?$',
        re.MULTILINE
    )
    
    lines = traceback_text.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        match = file_pattern.match(line)
        
        if match:
            file_path = match.group(1)
            line_number = int(match.group(2))
            function_name = match.group(3) if match.group(3) else None
            
            # Next line often contains the actual code
            code_line = None
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                # Code lines are typically indented and not file references
                if next_line and not next_line.startswith('File '):
                    code_line = next_line
            
            frames.append(StackFrame(
                file_path=file_path,
                line_number=line_number,
                function_name=function_name,
                code_line=code_line,
            ))
        
        i += 1
    
    return frames


def parse_javascript_stacktrace(stacktrace_text: str) -> List[StackFrame]:
    """
    Parse JavaScript/Node.js V8 stack trace format.
    
    Examples:
        at processData (/app/main.js:42:15)
        at Parser.parse (/app/parser.js:15:10)
        at /app/index.js:100:5
        at Object.<anonymous> (/app/server.ts:25:12)
    """
    frames = []
    
    # Pattern: at [function_name] (file_path:line:column)
    # or: at file_path:line:column
    patterns = [
        # With function name: at functionName (path:line:col)
        re.compile(r'^\s*at\s+([^\s(]+)\s+\(([^:]+):(\d+):(\d+)\)'),
        # Without function name: at path:line:col
        re.compile(r'^\s*at\s+([^:]+):(\d+):(\d+)'),
        # Edge case: at path:line (no column)
        re.compile(r'^\s*at\s+([^:]+):(\d+)'),
    ]
    
    for line in stacktrace_text.split('\n'):
        line = line.strip()
        if not line:
            continue
        
        # Try pattern with function name first
        match = patterns[0].match(line)
        if match:
            function_name = match.group(1)
            file_path = match.group(2)
            line_number = int(match.group(3))
            column = int(match.group(4)) if match.lastindex >= 4 else None
            
            frames.append(StackFrame(
                file_path=file_path,
                line_number=line_number,
                function_name=function_name,
                column=column,
            ))
            continue
        
        # Try pattern without function name
        match = patterns[1].match(line)
        if match:
            file_path = match.group(1)
            line_number = int(match.group(2))
            column = int(match.group(3)) if match.lastindex >= 3 else None
            
            frames.append(StackFrame(
                file_path=file_path,
                line_number=line_number,
                column=column,
            ))
            continue
        
        # Try pattern without column
        match = patterns[2].match(line)
        if match:
            file_path = match.group(1)
            line_number = int(match.group(2))
            
            frames.append(StackFrame(
                file_path=file_path,
                line_number=line_number,
            ))
    
    return frames


def parse_generic_error(error_text: str) -> List[StackFrame]:
    """
    Parse generic error messages that mention file paths and line numbers.
    
    Examples:
        "invalid syntax (<unknown>, line 10)"
        "SyntaxError in file.py at line 25"
        "Error in /app/main.js:42"
    """
    frames = []
    
    # Pattern: (file, line N) or file:line or "line N"
    patterns = [
        # (<path>, line N)
        re.compile(r'\(([^,)]+),\s+line\s+(\d+)\)'),
        # file.ext:line
        re.compile(r'([a-zA-Z0-9_./\\-]+\.[a-zA-Z]{1,5}):(\d+)'),
        # "at line N" or "line N" (extract line only)
        re.compile(r'(?:at\s+)?line\s+(\d+)', re.IGNORECASE),
    ]
    
    for pattern in patterns:
        matches = pattern.finditer(error_text)
        for match in matches:
            if len(match.groups()) >= 2:
                file_path = match.group(1)
                line_number = int(match.group(2))
                frames.append(StackFrame(
                    file_path=file_path,
                    line_number=line_number,
                ))
            elif len(match.groups()) == 1:
                # Line number only
                line_number = int(match.group(1))
                frames.append(StackFrame(
                    file_path="<unknown>",
                    line_number=line_number,
                ))
    
    return frames


def parse_stacktrace(error_text: str, error_detail: Optional[str] = None) -> ParsedStackTrace:
    """
    Parse stack trace from error text and detail, extracting structured frame information.
    
    Automatically detects format (Python, JavaScript, or generic) and returns structured data.
    
    Args:
        error_text: Short error message
        error_detail: Full stack trace or detailed error message
    
    Returns:
        ParsedStackTrace with structured frames
    """
    # Use error_detail if available, otherwise fall back to error_text
    source = (error_detail or error_text or '').strip()
    
    if not source:
        return ParsedStackTrace(frames=[], raw_trace='')
    
    frames = []
    
    # Try Python traceback format first
    if 'Traceback' in source or 'File "' in source:
        frames = parse_python_traceback(source)
    
    # Try JavaScript stack trace format
    if not frames and (' at ' in source or 'at Object.' in source):
        frames = parse_javascript_stacktrace(source)
    
    # Fall back to generic pattern matching
    if not frames:
        frames = parse_generic_error(source)
    
    return ParsedStackTrace(frames=frames, raw_trace=source)


def enhance_frame_with_source(frame: StackFrame, max_context_lines: int = 3) -> StackFrame:
    """
    Attempt to read source code from the file system for a given frame.
    
    This reads the actual source file and extracts the line of code
    plus surrounding context lines.
    
    Args:
        frame: StackFrame to enhance
        max_context_lines: Number of lines before/after to include
    
    Returns:
        Enhanced StackFrame with code_line populated (if file is readable)
    """
    import os
    
    # Skip if we already have the code line
    if frame.code_line:
        return frame
    
    # Try to read the source file
    try:
        # Normalize path (handle relative paths, etc.)
        file_path = frame.file_path
        
        # Skip special paths
        if file_path in ('<unknown>', '<string>', '<stdin>'):
            return frame
        
        # Check if file exists
        if not os.path.isfile(file_path):
            return frame
        
        # Read the specific line
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
            
            # Line numbers are 1-indexed
            if 1 <= frame.line_number <= len(lines):
                code_line = lines[frame.line_number - 1].rstrip()
                frame.code_line = code_line
    
    except Exception as e:
        # Silently fail — we don't want to break error reporting
        # because we can't read a source file
        print(f"[StackTraceParser] Could not read source for {frame.file_path}:{frame.line_number}: {e}")
    
    return frame


def parse_and_enhance_stacktrace(
    error_text: str,
    error_detail: Optional[str] = None,
    enhance_with_source: bool = True,
) -> Dict[str, Any]:
    """
    Parse stack trace and optionally enhance with source code context.
    
    Returns a JSON-serializable dict ready for API responses.
    """
    parsed = parse_stacktrace(error_text, error_detail)
    
    # Optionally enhance frames with actual source code
    if enhance_with_source:
        parsed.frames = [enhance_frame_with_source(frame) for frame in parsed.frames]
    
    return parsed.to_dict()
