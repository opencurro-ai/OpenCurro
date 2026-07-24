from __future__ import annotations

import re
from pathlib import PurePosixPath
from typing import Any, Optional

from src.agents.sandbox.base import SandboxContext
from src.schemas.sandbox import ToolExecutionResult

APPLY_PATCH_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "apply_patch",
        "description": (
            "Apply a structured patch to one or more files. "
            "Supports adding new files, deleting files, and updating existing files (with optional rename). "
            "The patch uses a special format with begin/end markers and per-line prefixes.\n\n"
            "Format specification:\n"
            "*** Begin Patch\n"
            "[one or more file operations]\n"
            "*** End Patch\n\n"
            "File operations:\n"
            "- *** Add File: <absolute_path>\n"
            "  Every following line must start with + (the file content).\n"
            "- *** Delete File: <absolute_path>\n"
            "  Remove an existing file (nothing follows).\n"
            "- *** Update File: <absolute_path>\n"
            "  Optionally followed by: *** Move to: <new_absolute_path>\n"
            "  Then one or more hunks. Each hunk starts with @@ (with optional hunk header).\n"
            "  Within a hunk:\n"
            "    ' ' prefix = context line (unchanged)\n"
            "    '-' prefix = line to remove\n"
            "    '+' prefix = line to add\n\n"
            "IMPORTANT:\n"
            "- All paths must be absolute (start with /home/user/).\n"
            "- When adding a file, every content line must start with +.\n"
            "- When updating a file, show 3 lines of context above and below each change.\n"
            "- If a code block is repeated, add @@ with class/function name for disambiguation.\n"
            "- Never use relative paths."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "input": {
                    "type": "string",
                    "description": (
                        "The full patch content conforming to the format described above."
                    ),
                }
            },
            "required": ["input"],
        },
    },
}

# ---------------------------------------------------------------------------
# Patch model
# ---------------------------------------------------------------------------


class PatchError(Exception):
    """Raised when patch parsing or validation fails with a human-readable message."""

    def __init__(self, message: str, detail: Optional[str] = None) -> None:
        self.message = message
        self.detail = detail
        super().__init__(message)


class PatchLine:
    """A single line within a hunk."""

    def __init__(self, prefix: str, text: str) -> None:
        self.prefix = prefix  # ' ', '-', or '+'
        self.text = text


class Hunk:
    """A hunk within an update operation."""

    def __init__(self, header: str = "") -> None:
        self.header = header  # Optional description like "class Foo"
        self.lines: list[PatchLine] = []


class FileOperation:
    """Base class for patch file operations."""


class AddFileOp(FileOperation):
    def __init__(self, path: str) -> None:
        self.path = path
        self.content_lines: list[str] = []


class DeleteFileOp(FileOperation):
    def __init__(self, path: str) -> None:
        self.path = path


class UpdateFileOp(FileOperation):
    def __init__(self, path: str) -> None:
        self.path = path
        self.move_to: Optional[str] = None
        self.hunks: list[Hunk] = []


class ParsedPatch:
    """The fully parsed patch."""

    def __init__(self) -> None:
        self.operations: list[FileOperation] = []


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

INVALID_PATH_PREFIXES = re.compile(
    r"^(?:\.\.?/|[~.])", re.IGNORECASE
)


def validate_absolute_path(path: str, label: str = "Path") -> str:
    """Validate that *path* is an absolute sandbox path. Return it stripped."""
    stripped = path.strip()
    if not stripped:
        raise PatchError(f"{label} is empty.")
    if INVALID_PATH_PREFIXES.match(stripped):
        raise PatchError(
            f"Relative paths are not allowed: '{stripped}'. "
            f"Use an absolute path under /home/user/."
        )
    try:
        p = PurePosixPath(stripped)
        if not p.is_absolute():
            raise ValueError()
    except (ValueError, TypeError):
        raise PatchError(
            f"Invalid path syntax: '{stripped}'. Use absolute paths starting with /home/user/."
        )
    # Ensure the path stays within the sandbox.
    if not stripped.startswith("/home/user/") and not stripped.startswith("/tmp/"):
        raise PatchError(
            f"Path '{stripped}' is outside the allowed sandbox area. "
            f"All paths must start with /home/user/ or /tmp/."
        )
    return stripped


# ---------------------------------------------------------------------------
# Patch parser
# ---------------------------------------------------------------------------


class PatchParser:
    """Parse an apply_patch input string into a ParsedPatch."""

    def __init__(self, text: str) -> None:
        self.lines = text.split("\n")
        self.pos = 0
        self.patch = ParsedPatch()

    def parse(self) -> ParsedPatch:
        self._skip_empty_lines()
        self._expect_begin()
        self._skip_empty_lines()

        file_paths_seen: set[str] = set()

        while self.pos < len(self.lines):
            self._skip_empty_lines()
            if self.pos >= len(self.lines):
                break
            line = self.lines[self.pos].rstrip("\r")

            # Check for end marker first
            if line == "*** End Patch":
                self.pos += 1
                return self.patch

            # Parse operation header
            if line.startswith("*** Add File: "):
                op = self._parse_add_file()
                if op.path in file_paths_seen:
                    raise PatchError(
                        f"Duplicate Add operation for '{op.path}'. "
                        f"Each file can only be added once."
                    )
                file_paths_seen.add(op.path)
                self.patch.operations.append(op)

            elif line.startswith("*** Delete File: "):
                op = self._parse_delete_file()
                if op.path in file_paths_seen:
                    raise PatchError(
                        f"Duplicate Delete operation for '{op.path}'. "
                        f"Each file can only be deleted once."
                    )
                file_paths_seen.add(op.path)
                self.patch.operations.append(op)

            elif line.startswith("*** Update File: "):
                op = self._parse_update_file()
                if op.path in file_paths_seen:
                    raise PatchError(
                        f"Duplicate Update operation for '{op.path}'. "
                        f"Each file can only be updated once."
                    )
                file_paths_seen.add(op.path)
                self.patch.operations.append(op)

            elif line.startswith("*** "):
                raise PatchError(
                    f"Unknown operation: '{line.strip()}'. "
                    f"Valid operations are: Add File, Delete File, Update File."
                )

            else:
                # Non-empty line that doesn't start with *** - unexpected
                stripped = line.strip()
                if stripped:
                    raise PatchError(
                        f"Unexpected content outside of a file operation: "
                        f"'{stripped}'. Expected '*** Begin Patch', '*** End Patch', "
                        f"or a file operation header."
                    )
                self.pos += 1

        raise PatchError(
            "Patch is missing the '*** End Patch' marker. "
            "Every patch must end with '*** End Patch'."
        )

    def _skip_empty_lines(self) -> None:
        while self.pos < len(self.lines) and self.lines[self.pos].strip() == "":
            self.pos += 1

    def _expect_begin(self) -> None:
        if self.pos >= len(self.lines):
            raise PatchError(
                "Patch is empty. Expected '*** Begin Patch' at the start."
            )
        line = self.lines[self.pos].rstrip("\r")
        if line != "*** Begin Patch":
            raise PatchError(
                f"Patch must start with '*** Begin Patch', but got: '{line.strip()}'. "
                f"The opening marker is missing or malformed."
            )
        self.pos += 1

    def _parse_add_file(self) -> AddFileOp:
        header = self.lines[self.pos].rstrip("\r")
        path_part = header[len("*** Add File: "):]
        path = validate_absolute_path(path_part, "Add File path")
        op = AddFileOp(path)
        self.pos += 1

        # Consume all + lines until next *** or end
        while self.pos < len(self.lines):
            raw = self.lines[self.pos]
            stripped_line = raw.strip()
            if stripped_line.startswith("***"):
                break
            if raw.startswith("+"):
                # Preserve everything after + (including trailing whitespace)
                op.content_lines.append(raw[1:])
                self.pos += 1
            elif stripped_line == "":
                # Truly empty line with no prefix — skip silently
                self.pos += 1
                continue
            else:
                raise PatchError(
                    f"Add File content for '{path}' must have each line "
                    f"prefixed with '+'. Got: '{raw}'"
                )

        return op

    def _parse_delete_file(self) -> DeleteFileOp:
        header = self.lines[self.pos].rstrip("\r")
        path_part = header[len("*** Delete File: "):]
        path = validate_absolute_path(path_part, "Delete File path")
        self.pos += 1
        return DeleteFileOp(path)

    def _parse_update_file(self) -> UpdateFileOp:
        header = self.lines[self.pos].rstrip("\r")
        path_part = header[len("*** Update File: "):]
        path = validate_absolute_path(path_part, "Update File path")
        op = UpdateFileOp(path)
        self.pos += 1

        # Check for optional Move to header
        self._skip_empty_lines()
        if self.pos < len(self.lines) and self.lines[self.pos].startswith("*** Move to: "):
            move_header = self.lines[self.pos].rstrip("\r")
            move_path_part = move_header[len("*** Move to: "):]
            move_path = validate_absolute_path(move_path_part, "Move to path")
            if move_path == path:
                raise PatchError(
                    f"Move to path '{move_path}' is the same as the original path "
                    f"'{path}'. Move is only needed when renaming."
                )
            op.move_to = move_path
            self.pos += 1

        # Parse hunks
        while self.pos < len(self.lines):
            raw = self.lines[self.pos].rstrip("\r")
            stripped_line = raw.strip()

            if stripped_line.startswith("***"):
                break

            if stripped_line == "":
                self.pos += 1
                continue

            if stripped_line.startswith("*** End of File"):
                # Optional end-of-file marker signals the end of this file operation
                self.pos += 1
                break

            # Hunk header
            if stripped_line.startswith("@@"):
                hunk = self._parse_hunk()
                op.hunks.append(hunk)
            else:
                # Unexpected line
                raise PatchError(
                    f"Unexpected line in Update File '{path}': '{stripped_line}'. "
                    f"Expected a hunk (starting with @@), '*** End of File', "
                    f"or the next operation."
                )

        if not op.hunks:
            raise PatchError(
                f"Update operation for '{path}' has no hunks. "
                f"When updating a file, you must provide at least one hunk "
                f"starting with @@ to specify the changes."
            )

        return op

    def _parse_hunk(self) -> Hunk:
        """Parse a hunk starting at current position."""
        raw = self.lines[self.pos].rstrip("\r")
        header_content = raw[2:].strip()  # Everything after @@
        hunk = Hunk(header=header_content)
        self.pos += 1

        # Consume hunk lines
        while self.pos < len(self.lines):
            raw = self.lines[self.pos].rstrip("\r")
            stripped_line = raw.strip()

            # A hunk ends at the start of a new operation, another hunk, or end marker
            if stripped_line.startswith("***") or stripped_line.startswith("@@"):
                break

            if stripped_line == "":
                self.pos += 1
                # Allow blank lines only if they represent context (no change)
                continue

            # Parse line prefix
            if raw.startswith(" "):
                hunk.lines.append(PatchLine(" ", raw[1:]))
            elif raw.startswith("-"):
                hunk.lines.append(PatchLine("-", raw[1:]))
            elif raw.startswith("+"):
                hunk.lines.append(PatchLine("+", raw[1:]))
            else:
                raise PatchError(
                    f"Invalid line prefix in hunk. "
                    f"Each hunk line must start with ' ' (context), "
                    f"'-' (removal), or '+' (addition). Got: '{raw}'"
                )
            self.pos += 1

        if not hunk.lines:
            raise PatchError(
                f"Empty hunk found{' (' + hunk.header + ')' if hunk.header else ''}. "
                f"Each hunk must contain at least one line."
            )

        self._validate_hunk(hunk)

        return hunk

    def _validate_hunk(self, hunk: Hunk) -> None:
        """Validate that a hunk makes sense."""
        has_additions = any(line.prefix == "+" for line in hunk.lines)
        has_removals = any(line.prefix == "-" for line in hunk.lines)
        has_context = any(line.prefix == " " for line in hunk.lines)

        if not has_additions and not has_removals:
            raise PatchError(
                f"Hunk contains only context lines (no changes). "
                f"Each hunk must have at least one '-' or '+' line."
            )

        # Check for empty update (hunk with only context)
        if not has_removals and not has_additions:
            raise PatchError(
                f"Hunk has no changes (no '-' or '+' lines). "
                f"Remove the hunk if no changes are needed."
            )


# ---------------------------------------------------------------------------
# Patch applier
# ---------------------------------------------------------------------------


async def apply_parsed_patch(
    parsed: ParsedPatch,
    sandbox_adapter,
    sandbox_context: SandboxContext,
) -> dict[str, Any]:
    """Apply a parsed patch to the sandbox, returning detailed results."""
    results: list[dict[str, Any]] = []

    for op in parsed.operations:
        if isinstance(op, AddFileOp):
            result = await _apply_add(op, sandbox_adapter, sandbox_context)
            results.append(result)
        elif isinstance(op, DeleteFileOp):
            result = await _apply_delete(op, sandbox_adapter, sandbox_context)
            results.append(result)
        elif isinstance(op, UpdateFileOp):
            result = await _apply_update(op, sandbox_adapter, sandbox_context)
            results.append(result)

    return results


async def _apply_add(
    op: AddFileOp,
    sandbox_adapter,
    sandbox_context: SandboxContext,
) -> dict[str, Any]:
    """Apply an Add File operation."""
    content = "\n".join(op.content_lines)
    # If content is non-empty, ensure trailing newline
    if content and not content.endswith("\n"):
        content += "\n"

    try:
        await sandbox_adapter.write_file(sandbox_context, op.path, content)
        return {
            "operation": "add",
            "file_path": op.path,
            "ok": True,
        }
    except Exception as exc:
        return {
            "operation": "add",
            "file_path": op.path,
            "ok": False,
            "error": str(exc),
        }


async def _apply_delete(
    op: DeleteFileOp,
    sandbox_adapter,
    sandbox_context: SandboxContext,
) -> dict[str, Any]:
    """Apply a Delete File operation."""
    # Use the sandbox to delete the file by writing empty content or using a command
    try:
        # Check if file exists first
        try:
            await sandbox_adapter.read_file(sandbox_context, op.path)
        except Exception:
            return {
                "operation": "delete",
                "file_path": op.path,
                "ok": False,
                "error": f"File does not exist: {op.path}",
            }

        # Delete via shell command (rm)
        command = f"rm {op.path}"
        result = await sandbox_adapter.run_command(
            sandbox_context, command, timeout=30, wait_for_output=True
        )
        if result.get("exit_code", 0) != 0:
            return {
                "operation": "delete",
                "file_path": op.path,
                "ok": False,
                "error": result.get("stderr", "Unknown error during deletion"),
            }
        return {
            "operation": "delete",
            "file_path": op.path,
            "ok": True,
        }
    except Exception as exc:
        return {
            "operation": "delete",
            "file_path": op.path,
            "ok": False,
            "error": str(exc),
        }


async def _apply_update(
    op: UpdateFileOp,
    sandbox_adapter,
    sandbox_context: SandboxContext,
) -> dict[str, Any]:
    """Apply an Update File operation by parsing hunks and applying them in order."""
    try:
        original_content = await sandbox_adapter.read_file(sandbox_context, op.path)
    except Exception as exc:
        return {
            "operation": "update",
            "file_path": op.path,
            "ok": False,
            "error": f"Failed to read file for update: {exc}",
        }

    current_content = original_content
    current_lines = current_content.split("\n")
    # Track if the file ends with a newline
    file_ends_with_newline = current_content.endswith("\n")

    applied: list[dict[str, Any]] = []

    for hunk_idx, hunk in enumerate(op.hunks):
        try:
            current_lines, result = _apply_single_hunk(
                current_lines, hunk, file_ends_with_newline, hunk_idx
            )
            applied.append(result)
        except PatchError as exc:
            return {
                "operation": "update",
                "file_path": op.path,
                "ok": False,
                "error": exc.message,
                "detail": exc.detail,
                "hunk_index": hunk_idx,
                "hunk_header": hunk.header,
                "applied_hunks": applied,
            }

    # Reconstruct content
    new_content = "\n".join(current_lines)
    if file_ends_with_newline and not new_content.endswith("\n"):
        new_content += "\n"
    elif not file_ends_with_newline and new_content.endswith("\n"):
        new_content = new_content.rstrip("\n")

    try:
        await sandbox_adapter.write_file(sandbox_context, op.path, new_content)
    except Exception as exc:
        return {
            "operation": "update",
            "file_path": op.path,
            "ok": False,
            "error": f"Failed to write updated file: {exc}",
            "applied_hunks": applied,
        }

    # Handle Move to (rename)
    rename_result: Optional[dict[str, Any]] = None
    if op.move_to:
        try:
            # Read the file we just wrote, then write to new location, then delete old
            content = await sandbox_adapter.read_file(sandbox_context, op.path)
            await sandbox_adapter.write_file(sandbox_context, op.move_to, content)
            # Delete old file
            await sandbox_adapter.run_command(
                sandbox_context, f"rm {op.path}", timeout=30, wait_for_output=True
            )
            rename_result = {
                "from": op.path,
                "to": op.move_to,
                "ok": True,
            }
        except Exception as exc:
            rename_result = {
                "from": op.path,
                "to": op.move_to,
                "ok": False,
                "error": str(exc),
            }
            return {
                "operation": "update",
                "file_path": op.path,
                "ok": False,
                "error": f"Failed to rename file: {exc}",
                "rename": rename_result,
                "applied_hunks": applied,
            }

    return {
        "operation": "update",
        "file_path": op.path,
        "ok": True,
        "move_to": op.move_to,
        "rename": rename_result,
        "applied_hunks": applied,
        "total_changes": len(applied),
    }


def _apply_single_hunk(
    current_lines: list[str],
    hunk: Hunk,
    file_ends_with_newline: bool,
    hunk_idx: int,
) -> tuple[list[str], dict[str, Any]]:
    """Apply a single hunk to the current lines. Returns (new_lines, result_dict)."""
    context_lines_to_match: list[str] = []
    removal_lines_to_match: list[str] = []
    addition_lines: list[str] = []

    for line in hunk.lines:
        if line.prefix == " ":
            context_lines_to_match.append(line.text)
        elif line.prefix == "-":
            removal_lines_to_match.append(line.text)
        elif line.prefix == "+":
            addition_lines.append(line.text)

    # Build the "search block": context lines interleaved with removal lines
    search_block: list[str] = []
    for line in hunk.lines:
        if line.prefix != "+":
            search_block.append(line.text)

    # Build the "replace block": context lines interleaved with addition lines
    replace_block: list[str] = []
    for line in hunk.lines:
        if line.prefix != "-":
            replace_block.append(line.text)

    # Search for the search block in current_lines
    # Use a sliding window approach
    window_len = len(search_block)

    if window_len == 0:
        raise PatchError(
            f"Hunk {hunk_idx + 1} has no context or removal lines to match against."
        )

    # Find occurrences of the search block
    occurrences: list[int] = []
    for i in range(len(current_lines) - window_len + 1):
        if current_lines[i:i + window_len] == search_block:
            occurrences.append(i)

    if not occurrences:
        # Try to provide a helpful error message
        context_preview = " | ".join(
            search_block[:min(3, len(search_block))]
        )
        raise PatchError(
            f"Hunk {hunk_idx + 1} could not be applied: "
            f"the target code block was not found in the file.",
            detail=(
                f"Searching for block starting with: '{context_preview}'"
                + (f" (hunk header: {hunk.header})" if hunk.header else "")
            ),
        )

    if len(occurrences) > 1:
        # Multiple matches - try to disambiguate using hunk header
        if hunk.header:
            # Try to narrow down by finding the header context first
            header_keyword = hunk.header.strip()
            if header_keyword:
                # Find lines that contain the header keyword and are near our match
                best_match = _disambiguate_with_header(
                    current_lines, occurrences, window_len, header_keyword
                )
                if best_match is not None:
                    occurrences = [best_match]

        if len(occurrences) > 1:
            raise PatchError(
                f"Hunk {hunk_idx + 1} matched {len(occurrences)} locations in the file. "
                f"Provide more context lines (use @@ with class/function name) "
                f"to uniquely identify the code to change.",
                detail=f"Matched at line indices: {occurrences[:5]}"
                + ("..." if len(occurrences) > 5 else ""),
            )

    match_start = occurrences[0]

    # Perform the replacement
    new_lines = (
        current_lines[:match_start]
        + replace_block
        + current_lines[match_start + window_len:]
    )

    lines_changed = (
        len(removal_lines_to_match)
        if removal_lines_to_match
        else len(addition_lines)
    )
    if removal_lines_to_match and addition_lines:
        change_type = "modify"
    elif removal_lines_to_match:
        change_type = "delete"
    else:
        change_type = "insert"

    return new_lines, {
        "change_type": change_type,
        "lines_changed": lines_changed,
        "match_start_line": match_start,
        "removed_lines": len(removal_lines_to_match),
        "added_lines": len(addition_lines),
    }


def _disambiguate_with_header(
    lines: list[str],
    occurrences: list[int],
    window_len: int,
    header_keyword: str,
) -> Optional[int]:
    """Try to find which occurrence is closest to a line matching the header keyword."""
    header_lower = header_keyword.lower()
    # Find the last line index that matches the header keyword before each occurrence
    scored: list[tuple[int, int]] = []  # (occurrence_index, distance)
    for occ in occurrences:
        # Search backwards from the match to find a line with the header keyword
        best_distance = float("inf")
        for search_start in range(max(0, occ - 30), occ):
            if header_lower in lines[search_start].lower():
                distance = occ - search_start
                if distance < best_distance:
                    best_distance = distance
                    break
        if best_distance < float("inf"):
            scored.append((occ, int(best_distance)))

    if not scored:
        return None

    # Return the occurrence with the smallest distance
    scored.sort(key=lambda x: x[1])
    return scored[0][0]


# ---------------------------------------------------------------------------
# Tool executor
# ---------------------------------------------------------------------------


async def execute_apply_patch(
    *,
    sandbox_adapter,
    sandbox_context: SandboxContext,
    arguments: dict,
    **kwargs,
) -> ToolExecutionResult:
    """Execute the apply_patch tool."""
    raw_input = arguments.get("input", "")
    if not raw_input or not raw_input.strip():
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "empty_patch",
                "message": (
                    "The patch input is empty. "
                    "Provide a valid patch starting with '*** Begin Patch' "
                    "and ending with '*** End Patch'."
                ),
            },
        )

    # Parse the patch
    try:
        parser = PatchParser(raw_input)
        parsed = parser.parse()
    except PatchError as exc:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "patch_parse_error",
                "message": exc.message,
                "detail": exc.detail,
                "suggestion": (
                    "Review the patch format: use '*** Begin Patch' to start, "
                    "'*** End Patch' to end, and ensure each file operation "
                    "has the correct header and content."
                ),
            },
        )
    except Exception as exc:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "patch_parse_exception",
                "message": f"Unexpected error while parsing patch: {exc}",
            },
        )

    # Apply the patch
    try:
        operation_results = await apply_parsed_patch(
            parsed, sandbox_adapter, sandbox_context
        )
    except PatchError as exc:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "patch_apply_error",
                "message": exc.message,
                "detail": exc.detail,
            },
        )
    except Exception as exc:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "patch_apply_exception",
                "message": f"Unexpected error while applying patch: {exc}",
            },
        )

    # Summarize
    total_ops = len(operation_results)
    succeeded = sum(1 for r in operation_results if r.get("ok"))
    failed = total_ops - succeeded

    return ToolExecutionResult(
        ok=failed == 0,
        data={
            "total_operations": total_ops,
            "succeeded": succeeded,
            "failed": failed,
            "operations": operation_results,
        },
    )
