from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "chatgpt-export"


def run_cli(*args: str, cwd: Path | None = None) -> dict:
    proc = subprocess.run(
        [sys.executable, "-m", "everthread", *args],
        cwd=cwd or ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(proc.stdout)


def test_init_import_digest_and_recall_budget(tmp_path: Path) -> None:
    workspace = tmp_path / "memory"

    init_result = run_cli("init", str(workspace))
    assert (workspace / "everthread.json").exists()
    assert "cold-warehouse/imports" in init_result["created_dirs"]

    import_result = run_cli(
        "import",
        "chatgpt",
        str(FIXTURE),
        "--workspace",
        str(workspace),
        "--batch-id",
        "fixture-batch",
    )
    assert import_result["unique_conversations"] == 2
    assert import_result["markdown_files"] == 2
    assert (workspace / "cold-warehouse" / "manifests" / "fixture-batch.json").exists()

    digest_result = run_cli("digest", "monthly", "--workspace", str(workspace))
    assert "2026-06" in digest_result["months"]
    assert "2026-07" in digest_result["months"]
    assert digest_result["months"]["2026-06"]["message_blocks"] == 2
    assert digest_result["months"]["2026-07"]["message_blocks"] == 2
    assert (workspace / "dream" / "monthly" / "index.md").exists()

    budget_result = run_cli("recall-budget", "--workspace", str(workspace), "--force")
    budget = json.loads(Path(budget_result["recall_budget"]).read_text(encoding="utf-8"))
    assert budget["default_policy"]["legacy_query_default"] == "off"


def test_no_markdown_import(tmp_path: Path) -> None:
    workspace = tmp_path / "memory"
    run_cli("init", str(workspace))
    result = run_cli(
        "import",
        "chatgpt",
        str(FIXTURE),
        "--workspace",
        str(workspace),
        "--batch-id",
        "manifest-only",
        "--no-markdown",
    )
    assert result["unique_conversations"] == 2
    assert result["markdown_files"] == 0
    assert result["text_dir"] is None


def write_conversation(workspace: Path, name: str, created_at: str, title: str) -> None:
    batch = workspace / "cold-warehouse" / "text" / "manual-batch"
    batch.mkdir(parents=True, exist_ok=True)
    (batch / name).write_text(
        "\n".join(
            [
                "---",
                f"created_at: {created_at}",
                f"updated_at: {created_at}",
                f"conversation_id_sha256: {name.removesuffix('.md')}",
                "---",
                "",
                f"# {title}",
                "",
                "## 2026-06-17T12:00:00Z - User",
                "",
                "Private body is fixture-only and should not be quoted by digests.",
                "",
            ]
        ),
        encoding="utf-8",
    )


def test_life_rings_digest_groups_daily_patterns_without_body_quotes(tmp_path: Path) -> None:
    workspace = tmp_path / "memory"
    run_cli("init", str(workspace))
    write_conversation(workspace, "2026-06-02-dinner.md", "2026-06-02T12:00:00Z", "Dinner rhythm and meal prep")
    write_conversation(workspace, "2026-06-03-walk.md", "2026-06-03T12:00:00Z", "Evening walk after school pickup")
    write_conversation(workspace, "2026-06-18-feelings.md", "2026-06-18T12:00:00Z", "Feeling anxious and needing reassurance")
    write_conversation(workspace, "2026-06-19-project.md", "2026-06-19T12:00:00Z", "Fix Telegram bot deployment")

    result = run_cli("digest", "life-rings", "--workspace", str(workspace))

    assert result["fragments"] == 3
    assert result["period_cards"]["weekly"] == 2
    assert result["period_cards"]["monthly"] == 1
    assert (workspace / "dream" / "life-rings" / "weekly.json").exists()
    assert (workspace / "dream" / "life-rings" / "index.md").exists()

    weekly = json.loads((workspace / "dream" / "life-rings" / "weekly.json").read_text(encoding="utf-8"))
    first_card = weekly["cards"][0]
    assert first_card["schema"] == "everthread.life_ring_card.v0.1"
    assert first_card["period"] == "2026-W23"
    assert first_card["source_count"] == 2
    assert first_card["category_counts"] == {"food": 1, "schedule": 1}
    assert first_card["raw_body_included"] is False
    assert "Private body" not in json.dumps(weekly, ensure_ascii=False)
