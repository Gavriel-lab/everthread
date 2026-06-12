from __future__ import annotations

import argparse
import json
import shutil
import sys
import zipfile
from pathlib import Path

from .digest import generate_monthly_digests
from .importers.chatgpt import import_chatgpt_export
from .workspace import create_workspace, write_recall_budget


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="everthread",
        description="Portable memory starter kit for emotionally continuous AI companions.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init", help="Create an Everthread memory workspace.")
    init.add_argument("path", nargs="?", default="everthread-memory")
    init.add_argument("--force", action="store_true", help="Overwrite starter files if they already exist.")

    imp = sub.add_parser("import", help="Import chat exports into the cold warehouse.")
    imp_sub = imp.add_subparsers(dest="importer", required=True)
    chatgpt = imp_sub.add_parser("chatgpt", help="Import ChatGPT export folder or zip files.")
    chatgpt.add_argument("source", help="Export folder or zip file.")
    chatgpt.add_argument("--workspace", "-w", default="everthread-memory")
    chatgpt.add_argument("--batch-id", default=None)
    chatgpt.add_argument("--no-markdown", action="store_true", help="Only create manifest/hash files.")

    digest = sub.add_parser("digest", help="Generate digest files.")
    digest_sub = digest.add_subparsers(dest="digest_type", required=True)
    monthly = digest_sub.add_parser("monthly", help="Generate monthly digest from imported conversations.")
    monthly.add_argument("--workspace", "-w", default="everthread-memory")

    budget = sub.add_parser("recall-budget", help="Write a default recall budget file.")
    budget.add_argument("--workspace", "-w", default="everthread-memory")
    budget.add_argument("--force", action="store_true")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        if args.command == "init":
            result = create_workspace(Path(args.path), force=args.force)
        elif args.command == "import" and args.importer == "chatgpt":
            result = import_chatgpt_export(
                source=Path(args.source),
                workspace=Path(args.workspace),
                batch_id=args.batch_id,
                write_markdown=not args.no_markdown,
            )
        elif args.command == "digest" and args.digest_type == "monthly":
            result = generate_monthly_digests(Path(args.workspace))
        elif args.command == "recall-budget":
            result = write_recall_budget(Path(args.workspace), force=args.force)
        else:
            parser.error("unsupported command")
            return 2
    except FileExistsError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except FileNotFoundError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0
