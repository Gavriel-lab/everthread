from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


WORKSPACE_DIRS = [
    "hot-brain",
    "hot-brain/accepted",
    "cold-warehouse",
    "cold-warehouse/imports",
    "cold-warehouse/hashes",
    "cold-warehouse/manifests",
    "cold-warehouse/text",
    "dream",
    "dream/daily",
    "dream/monthly",
    "adapters",
]


DEFAULT_RECALL_BUDGET = {
    "schema": "everthread.recall_budget.v0.1",
    "created_at": None,
    "default_policy": {
        "legacy_query_default": "off",
        "max_legacy_queries_per_interaction": 1,
        "max_results_per_legacy_query": 5,
        "max_source_excerpt_chars_per_result": 360,
        "max_total_legacy_context_chars": 1800,
        "prefer_digest_before_raw_search": True,
        "prefer_registry_before_raw_drawer": True,
    },
    "allowed_triggers": [
        "user explicitly asks for old memory",
        "hot brain context is insufficient",
        "current task needs an old decision or promise",
        "dream layer is doing bounded consolidation",
    ],
    "blocked_by_default": [
        "bulk raw transcript recall",
        "full conversation dump",
        "attachment asset recall",
        "automatic legacy search for ordinary chat",
        "direct promotion from legacy drawer to accepted memory",
    ],
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, payload: object, force: bool = True) -> None:
    if path.exists() and not force:
        raise FileExistsError(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def create_workspace(path: Path, force: bool = False) -> dict[str, object]:
    path.mkdir(parents=True, exist_ok=True)
    created = []
    for rel in WORKSPACE_DIRS:
        directory = path / rel
        directory.mkdir(parents=True, exist_ok=True)
        created.append(rel)

    config_path = path / "everthread.json"
    config = {
        "schema": "everthread.workspace.v0.2",
        "created_at": now_iso(),
        "paths": {
            "hot_brain": "hot-brain",
            "cold_warehouse": "cold-warehouse",
            "dream": "dream",
            "adapters": "adapters",
        },
    }
    write_json(config_path, config, force=force or not config_path.exists())
    write_recall_budget(path, force=force or not (path / "recall-budget.json").exists())
    return {"workspace": str(path), "created_dirs": created, "config": str(config_path)}


def write_recall_budget(workspace: Path, force: bool = False) -> dict[str, object]:
    workspace.mkdir(parents=True, exist_ok=True)
    payload = dict(DEFAULT_RECALL_BUDGET)
    payload["created_at"] = now_iso()
    target = workspace / "recall-budget.json"
    write_json(target, payload, force=force or not target.exists())
    return {"workspace": str(workspace), "recall_budget": str(target)}
