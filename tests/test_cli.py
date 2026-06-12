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
