from __future__ import annotations

import hashlib
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.S)
HEADING_RE = re.compile(r"^# (.+)$", re.M)
MESSAGE_RE = re.compile(
    r"^##\s+.+?\s+-\s+(User|Assistant|System|Tool|Unknown|Developer)\s*$", re.M
)


def parse_frontmatter(text: str) -> dict[str, str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}
    out: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        out[key.strip()] = value.strip()
    return out


def month_from_file(path: Path, metadata: dict[str, str]) -> str:
    created = metadata.get("created_at", "")
    if re.match(r"^\d{4}-\d{2}", created):
        return created[:7]
    match = re.match(r"(\d{4}-\d{2})-\d{2}", path.name)
    if match:
        return match.group(1)
    return "unknown"


def title_preview(text: str) -> str:
    match = HEADING_RE.search(text)
    title = " ".join((match.group(1) if match else "Untitled").split())
    return title[:80]


def conversation_digest(path: Path, root: Path) -> dict[str, Any]:
    raw = path.read_bytes()
    text = raw.decode("utf-8", errors="replace")
    metadata = parse_frontmatter(text)
    title = title_preview(text)
    return {
        "source": str(path.relative_to(root)),
        "created_at": metadata.get("created_at", "unknown"),
        "updated_at": metadata.get("updated_at", "unknown"),
        "conversation_id_sha256": metadata.get("conversation_id_sha256", "unknown"),
        "title_hash": hashlib.sha256(title.encode("utf-8")).hexdigest()[:12],
        "title_preview": title,
        "message_blocks": len(MESSAGE_RE.findall(text)),
        "characters": len(text),
        "content_hash": hashlib.sha256(raw).hexdigest(),
        "month": month_from_file(path, metadata),
    }


def iter_text_files(workspace: Path) -> list[tuple[Path, Path]]:
    text_root = workspace / "cold-warehouse" / "text"
    if not text_root.exists():
        raise FileNotFoundError(text_root)
    rows = []
    for batch_dir in sorted(p for p in text_root.iterdir() if p.is_dir()):
        for path in sorted(batch_dir.glob("*.md")):
            rows.append((batch_dir, path))
    return rows


def write_month_files(output_dir: Path, month: str, rows: list[dict[str, Any]]) -> None:
    payload = {
        "schema": "everthread.monthly_digest.v0.1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "month": month,
        "conversation_files": len(rows),
        "message_blocks": sum(item["message_blocks"] for item in rows),
        "characters": sum(item["characters"] for item in rows),
        "privacy_note": "No message bodies are quoted. Raw text remains in the cold warehouse.",
        "files": [
            {key: value for key, value in item.items() if key != "month"}
            for item in rows
        ],
    }
    (output_dir / f"{month}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    lines = [
        f"# Everthread Monthly Digest: {month}",
        "",
        "This digest is a recall map. It does not quote private message bodies.",
        "",
        "## Summary",
        "",
        f"- conversation files: {len(rows)}",
        f"- message blocks: {payload['message_blocks']}",
        f"- characters indexed: {payload['characters']}",
        "",
        "## Conversation Map",
        "",
        "| Created | Messages | Title hash | Preview | Source |",
        "|---|---:|---|---|---|",
    ]
    for item in rows:
        preview = str(item["title_preview"]).replace("|", "/")
        lines.append(
            f"| {str(item['created_at'])[:10]} | {item['message_blocks']} | `{item['title_hash']}` | {preview} | `{item['source']}` |"
        )
    lines.append("")
    (output_dir / f"{month}.md").write_text("\n".join(lines), encoding="utf-8")


def generate_monthly_digests(workspace: Path) -> dict[str, Any]:
    output_dir = workspace / "dream" / "monthly"
    output_dir.mkdir(parents=True, exist_ok=True)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for root, path in iter_text_files(workspace):
        item = conversation_digest(path, root)
        grouped[item["month"]].append(item)

    if not grouped:
        raise ValueError("no imported conversation markdown files found")

    month_index: dict[str, dict[str, int]] = {}
    for month, rows in sorted(grouped.items()):
        rows.sort(key=lambda item: (str(item["created_at"]), str(item["source"])))
        write_month_files(output_dir, month, rows)
        month_index[month] = {
            "conversation_files": len(rows),
            "message_blocks": sum(item["message_blocks"] for item in rows),
            "characters": sum(item["characters"] for item in rows),
        }

    index = {
        "schema": "everthread.monthly_digest_index.v0.1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "months": month_index,
    }
    (output_dir / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    md_lines = [
        "# Everthread Monthly Digest Index",
        "",
        "| Month | Conversations | Messages | Characters |",
        "|---|---:|---:|---:|",
    ]
    for month, counts in month_index.items():
        md_lines.append(
            f"| {month} | {counts['conversation_files']} | {counts['message_blocks']} | {counts['characters']} |"
        )
    md_lines.append("")
    (output_dir / "index.md").write_text("\n".join(md_lines), encoding="utf-8")

    return {
        "workspace": str(workspace),
        "output_dir": str(output_dir),
        "months": month_index,
    }
