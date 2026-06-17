from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .digest import conversation_digest, iter_text_files


CATEGORY_PATTERNS = {
    "food": re.compile(
        r"\b(dinner|lunch|breakfast|meal|food|cook|prep|recipe|grocery|chicken|vegetable)\b|"
        r"配菜|吃饭|晚饭|午饭|早餐|做菜|鸡胸|备菜|健康餐|分装",
        re.I,
    ),
    "schedule": re.compile(
        r"\b(schedule|routine|morning|noon|afternoon|evening|night|walk|school pickup|home|sleep)\b|"
        r"作息|早上|中午|下午|晚上|睡|醒|出门|散步|接小朋友|放学|回家",
        re.I,
    ),
    "emotion": re.compile(
        r"\b(feeling|anxious|sad|upset|reassurance|comfort|emotion|mood|expectation|preference)\b|"
        r"喜欢|讨厌|习惯|期待|难过|害怕|委屈|安抚|情绪|安全感|记得",
        re.I,
    ),
    "body": re.compile(
        r"\b(body|tired|pain|hurt|sick|period|energy|battery|sleepy|health|cold compress)\b|"
        r"身体|姨妈|电量|充电|累|困|疼|胃|精神|状态|痛|冷敷|肿|发热",
        re.I,
    ),
}

EXCLUDE_PATTERN = re.compile(
    r"\b(project|deploy|deployment|server|bot|github|codex|vps|bug|fix|ci)\b|"
    r"项目|部署|服务器|回滚|报错|修复|机器人|技术|工单",
    re.I,
)


def generated_at() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_datetime(value: str) -> datetime | None:
    if not value or value == "unknown":
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def period_keys(value: str) -> dict[str, str]:
    parsed = parse_datetime(value)
    if parsed is None:
        return {
            "week": "unknown",
            "month": "unknown",
            "quarter": "unknown",
            "half_year": "unknown",
            "year": "unknown",
        }
    iso = parsed.isocalendar()
    month = parsed.month
    return {
        "week": f"{iso.year}-W{iso.week:02d}",
        "month": f"{parsed.year}-{month:02d}",
        "quarter": f"{parsed.year}-Q{((month - 1) // 3) + 1}",
        "half_year": f"{parsed.year}-H{1 if month <= 6 else 2}",
        "year": str(parsed.year),
    }


def created_at_for_period(item: dict[str, Any]) -> str:
    created_at = str(item.get("created_at", ""))
    if parse_datetime(created_at) is not None:
        return created_at
    match = re.search(r"(\d{4}-\d{2}-\d{2})", str(item.get("source", "")))
    if match:
        return f"{match.group(1)}T00:00:00Z"
    return created_at


def classify_life_fragment(item: dict[str, Any]) -> dict[str, Any]:
    text = " ".join(
        str(item.get(key, ""))
        for key in ("title_preview", "source")
    )
    if EXCLUDE_PATTERN.search(text):
        return {"eligible": False, "categories": [], "reason": "project_or_technical_record"}

    categories = [
        category
        for category, pattern in CATEGORY_PATTERNS.items()
        if pattern.search(text)
    ]
    if not categories:
        return {"eligible": False, "categories": [], "reason": "no_daily_life_signal"}

    return {
        "eligible": True,
        "categories": categories,
        "reason": "daily_life_pattern_candidate",
    }


def life_fragment(item: dict[str, Any], classification: dict[str, Any]) -> dict[str, Any]:
    period_created_at = created_at_for_period(item)
    periods = period_keys(period_created_at)
    return {
        "schema": "everthread.life_ring_fragment.v0.1",
        "source": item["source"],
        "created_at": item["created_at"],
        "period_created_at": period_created_at,
        "conversation_id_sha256": item["conversation_id_sha256"],
        "title_hash": item["title_hash"],
        "title_preview": item["title_preview"],
        "message_blocks": item["message_blocks"],
        "categories": classification["categories"],
        "periods": periods,
        "raw_body_included": False,
    }


def build_card(period_type: str, period: str, fragments: list[dict[str, Any]], now: str) -> dict[str, Any]:
    category_counts: Counter[str] = Counter()
    source_files = []
    previews = []
    message_blocks = 0
    for fragment in fragments:
        category_counts.update(fragment["categories"])
        source_files.append(fragment["source"])
        message_blocks += int(fragment.get("message_blocks", 0))
        previews.append(
            {
                "title_hash": fragment["title_hash"],
                "title_preview": fragment["title_preview"],
                "source": fragment["source"],
                "categories": fragment["categories"],
            }
        )

    categories = sorted(category_counts)
    return {
        "schema": "everthread.life_ring_card.v0.1",
        "generated_at": now,
        "period_type": period_type,
        "period": period,
        "title": f"Life Rings {period_type}: {period}",
        "source_count": len(fragments),
        "message_blocks": message_blocks,
        "category_counts": dict(sorted(category_counts.items())),
        "source_files": sorted(source_files),
        "previews": previews[:12],
        "summary": (
            "Daily-life fragments in this period were compressed into a Life Rings card: "
            + ", ".join(categories)
            + "."
        ),
        "privacy_note": "No message bodies are quoted. Life Rings uses metadata and title previews by default.",
        "raw_body_included": False,
    }


def group_cards(fragments: list[dict[str, Any]], now: str) -> dict[str, list[dict[str, Any]]]:
    period_map = {
        "weekly": ("week", "week"),
        "monthly": ("month", "month"),
        "quarterly": ("quarter", "quarter"),
        "half_year": ("half_year", "half_year"),
        "yearly": ("year", "year"),
    }
    output: dict[str, list[dict[str, Any]]] = {}
    for output_name, (period_type, period_key) in period_map.items():
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for fragment in fragments:
            grouped[fragment["periods"][period_key]].append(fragment)
        output[output_name] = [
            build_card(period_type, period, rows, now)
            for period, rows in sorted(grouped.items())
        ]
    return output


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_index_md(output_dir: Path, cards: dict[str, list[dict[str, Any]]]) -> None:
    lines = [
        "# Everthread Life Rings",
        "",
        "Life Rings turn repeated daily-life fragments into periodic cards without quoting private message bodies.",
        "",
        "| Layer | Period | Sources | Categories |",
        "|---|---|---:|---|",
    ]
    for layer, rows in cards.items():
        for card in rows:
            categories = ", ".join(card["category_counts"].keys())
            lines.append(f"| {layer} | {card['period']} | {card['source_count']} | {categories} |")
    lines.append("")
    (output_dir / "index.md").write_text("\n".join(lines), encoding="utf-8")


def generate_life_rings(workspace: Path) -> dict[str, Any]:
    rows = [
        conversation_digest(path, root)
        for root, path in iter_text_files(workspace)
    ]
    fragments = []
    for item in rows:
        classification = classify_life_fragment(item)
        if classification["eligible"]:
            fragments.append(life_fragment(item, classification))

    if not fragments:
        raise ValueError("no daily-life candidates found for Life Rings")

    now = generated_at()
    output_dir = workspace / "dream" / "life-rings"
    output_dir.mkdir(parents=True, exist_ok=True)
    cards = group_cards(fragments, now)

    write_json(
        output_dir / "fragments.json",
        {
            "schema": "everthread.life_ring_fragment_index.v0.1",
            "generated_at": now,
            "fragments": fragments,
            "raw_body_included": False,
        },
    )
    for name, rows_for_period in cards.items():
        write_json(
            output_dir / f"{name}.json",
            {
                "schema": "everthread.life_ring_period_index.v0.1",
                "generated_at": now,
                "period_layer": name,
                "cards": rows_for_period,
                "raw_body_included": False,
            },
        )
    index = {
        "schema": "everthread.life_rings_index.v0.1",
        "generated_at": now,
        "workspace": str(workspace),
        "output_dir": str(output_dir),
        "fragments": len(fragments),
        "period_cards": {name: len(rows_for_period) for name, rows_for_period in cards.items()},
        "privacy_note": "No message bodies are quoted. Raw text remains in the cold warehouse.",
    }
    write_json(output_dir / "index.json", index)
    write_index_md(output_dir, cards)
    return index
