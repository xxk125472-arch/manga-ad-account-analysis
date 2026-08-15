#!/usr/bin/env python3
"""Command-line entry point for the complete analysis pipeline."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from manga_ad_analysis.pipeline import PipelinePaths, run_pipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="生成漫剧投放分析的全部派生文件")
    parser.add_argument(
        "--source",
        type=Path,
        default=PROJECT_ROOT
        / "data"
        / "processed"
        / "manga_ad_account_2026_07_anonymized.xlsx",
        help="深度脱敏源工作簿路径",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    paths = PipelinePaths(
        processed_dir=PROJECT_ROOT / "data" / "processed",
        dashboard_json=PROJECT_ROOT / "web" / "public" / "data" / "dashboard.json",
        image_dir=PROJECT_ROOT / "images",
        receipt_path=PROJECT_ROOT / "outputs" / "pipeline_receipt.json",
    )
    receipt = run_pipeline(args.source, paths)
    print(json.dumps(receipt["checks"], ensure_ascii=False, indent=2))
    return 0 if receipt["checks"]["all_reconciliations_passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
