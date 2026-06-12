from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, Iterable

from ..workspace import now_iso, write_json


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_batch_id(source: Path) -> str:
    stem = source.stem if source.is_file() else source.name
    cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "-", stem).strip("-").lower()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"{cleaned or 'chatgpt-export'}-{stamp}"


def extract_if_zip(source: Path, temp_root: Path) -> Path:
    if source.is_dir():
        return source
    if not source.exists():
        raise FileNotFoundError(source)
    if source.suffix.lower() != ".zip":
        raise ValueError(f"unsupported source type: {source}")
    target = temp_root / "unzipped"
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source) as archive:
        archive.extractall(target)
    return target


def find_conversation_files(root: Path) -> list[Path]:
    files = [
        p
        for p in root.rglob("conversations*.json")
        if p.is_file() and "conversation_asset_file_names" not in p.name
    ]
    return sorted(files)


def load_json_array(path: Path) -> list[dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON in {path}: {exc}") from exc
    if not isinstance(data, list):
        raise ValueError(f"expected a JSON array in {path}")
    return [item for item in data if isinstance(item, dict)]


def conversation_id(item: dict[str, Any]) -> str | None:
    value = item.get("id") or item.get("conversation_id") or item.get("conversationId")
    return value if isinstance(value, str) and value else None


def timestamp_to_day(value: Any) -> str:
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, timezone.utc).strftime("%Y-%m-%d")
    return "unknown-date"


def timestamp_to_iso(value: Any) -> str:
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, timezone.utc).isoformat()
    return "unknown"


def extract_text(content: Any) -> str:
    if not isinstance(content, dict):
        return ""
    parts = content.get("parts")
    chunks: list[str] = []
    if isinstance(parts, list):
        for part in parts:
            if isinstance(part, str):
                chunks.append(part)
            elif isinstance(part, dict):
                text = part.get("text") or part.get("content")
                if isinstance(text, str):
                    chunks.append(text)
                elif part:
                    chunks.append("[non-text content omitted]")
    elif isinstance(content.get("text"), str):
        chunks.append(content["text"])
    if not chunks and content.get("content_type") not in (None, "text"):
        return "[non-text content omitted]"
    return "\n".join(chunk.strip() for chunk in chunks if chunk and chunk.strip()).strip()


def iter_messages(conversation: dict[str, Any]) -> Iterable[tuple[float, str, str]]:
    mapping = conversation.get("mapping")
    if not isinstance(mapping, dict):
        return
    rows: list[tuple[float, str, str]] = []
    for node in mapping.values():
        if not isinstance(node, dict):
            continue
        message = node.get("message")
        if not isinstance(message, dict):
            continue
        author = message.get("author") if isinstance(message.get("author"), dict) else {}
        role = author.get("role") if isinstance(author, dict) else "unknown"
        text = extract_text(message.get("content"))
        if not text:
            continue
        created = message.get("create_time") or node.get("create_time") or conversation.get("create_time") or 0
        if not isinstance(created, (int, float)):
            created = 0
        rows.append((created, str(role or "unknown"), text))
    for row in sorted(rows, key=lambda item: item[0]):
        yield row


def role_label(role: str) -> str:
    return {
        "user": "User",
        "assistant": "Assistant",
        "system": "System",
        "tool": "Tool",
    }.get(role, role.title() or "Unknown")


def write_conversation_markdown(
    target_dir: Path,
    conversation: dict[str, Any],
    batch_id: str,
    source_file: str,
) -> dict[str, Any]:
    cid = conversation_id(conversation) or "unknown"
    cid_hash = hashlib.sha256(cid.encode("utf-8")).hexdigest()
    day = timestamp_to_day(conversation.get("create_time"))
    short = cid_hash[:16]
    target = target_dir / f"{day}_{short}.md"
    title = " ".join(str(conversation.get("title") or "Untitled").split())[:120]

    lines = [
        "---",
        "source: chatgpt_export",
        f"import_batch: {batch_id}",
        f"conversation_id_sha256: {cid_hash}",
        f"created_at: {timestamp_to_iso(conversation.get('create_time'))}",
        f"updated_at: {timestamp_to_iso(conversation.get('update_time'))}",
        f"source_file: {source_file}",
        "privacy: private_raw_chat_text",
        "---",
        "",
        f"# {title}",
        "",
        f"import_marker: everthread_{batch_id}",
        "",
    ]

    message_blocks = 0
    for created, role, text in iter_messages(conversation):
        message_blocks += 1
        lines.append(f"## {timestamp_to_iso(created)} - {role_label(role)}")
        lines.append("")
        lines.append(text)
        lines.append("")

    target.write_text("\n".join(lines), encoding="utf-8")
    return {
        "path": str(target),
        "conversation_id_sha256": cid_hash,
        "message_blocks": message_blocks,
        "sha256": sha256_file(target),
    }


def import_chatgpt_export(
    source: Path,
    workspace: Path,
    batch_id: str | None = None,
    write_markdown: bool = True,
) -> dict[str, Any]:
    workspace.mkdir(parents=True, exist_ok=True)
    batch_id = batch_id or safe_batch_id(source)
    import_root = workspace / "cold-warehouse" / "imports" / batch_id
    manifest_dir = workspace / "cold-warehouse" / "manifests"
    hash_dir = workspace / "cold-warehouse" / "hashes"
    text_dir = workspace / "cold-warehouse" / "text" / batch_id
    import_root.mkdir(parents=True, exist_ok=True)
    manifest_dir.mkdir(parents=True, exist_ok=True)
    hash_dir.mkdir(parents=True, exist_ok=True)
    if write_markdown:
        text_dir.mkdir(parents=True, exist_ok=True)

    with TemporaryDirectory() as temp_name:
        temp_root = Path(temp_name)
        scan_root = extract_if_zip(source, temp_root)
        conversation_files = find_conversation_files(scan_root)
        if not conversation_files:
            raise ValueError(f"no conversations*.json files found in {source}")

        seen: set[str] = set()
        duplicate_ids = 0
        conversations: list[dict[str, Any]] = []
        source_summaries = []
        for file in conversation_files:
            rows = load_json_array(file)
            file_ids = 0
            for row in rows:
                cid = conversation_id(row)
                if not cid:
                    continue
                cid_hash = hashlib.sha256(cid.encode("utf-8")).hexdigest()
                file_ids += 1
                if cid_hash in seen:
                    duplicate_ids += 1
                    continue
                seen.add(cid_hash)
                row["_everthread_source_file"] = str(file.relative_to(scan_root))
                conversations.append(row)
            source_summaries.append(
                {
                    "path": str(file.relative_to(scan_root)),
                    "sha256": sha256_file(file),
                    "conversation_ids": file_ids,
                }
            )

        if source.is_file():
            shutil.copy2(source, import_root / source.name)
        else:
            (import_root / "SOURCE.txt").write_text(str(source.resolve()), encoding="utf-8")

        markdown_files = []
        if write_markdown:
            for conversation in conversations:
                markdown_files.append(
                    write_conversation_markdown(
                        text_dir,
                        conversation,
                        batch_id,
                        conversation.get("_everthread_source_file", "unknown"),
                    )
                )

    manifest = {
        "schema": "everthread.chatgpt_import_manifest.v0.2",
        "created_at": now_iso(),
        "batch_id": batch_id,
        "source": str(source),
        "workspace": str(workspace),
        "conversation_files": source_summaries,
        "unique_conversations": len(conversations),
        "duplicate_conversation_ids_skipped": duplicate_ids,
        "markdown_written": write_markdown,
        "text_dir": str(text_dir) if write_markdown else None,
        "privacy_note": "Manifest excludes message bodies. Raw text may exist under cold-warehouse/text if markdown_written is true.",
    }
    write_json(manifest_dir / f"{batch_id}.json", manifest)
    (hash_dir / f"{batch_id}.ids.sha256.txt").write_text("\n".join(sorted(seen)) + "\n", encoding="utf-8")

    return {
        "workspace": str(workspace),
        "batch_id": batch_id,
        "unique_conversations": len(conversations),
        "duplicate_conversation_ids_skipped": duplicate_ids,
        "manifest": str(manifest_dir / f"{batch_id}.json"),
        "hashes": str(hash_dir / f"{batch_id}.ids.sha256.txt"),
        "text_dir": str(text_dir) if write_markdown else None,
        "markdown_files": len(markdown_files),
    }
