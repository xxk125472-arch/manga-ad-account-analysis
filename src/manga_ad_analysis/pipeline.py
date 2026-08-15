"""End-to-end export pipeline for CSV, dashboard JSON, figures, and receipt."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .io import load_source
from .metrics import brand_summary, safe_divide
from .quality import quality_summary
from .segmentation import build_pareto, segment_accounts
from .visuals import create_all_figures


@dataclass(frozen=True)
class PipelinePaths:
    """Explicit output targets; the pipeline never deletes unrelated files."""

    processed_dir: Path
    dashboard_json: Path
    image_dir: Path
    receipt_path: Path


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _json_value(value: Any) -> Any:
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return None if not np.isfinite(value) else float(value)
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    return value


def _records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    return [
        {key: _json_value(value) for key, value in record.items()}
        for record in frame.to_dict(orient="records")
    ]


def _segment_summary(segmented: pd.DataFrame) -> pd.DataFrame:
    result = (
        segmented.groupby("action_segment", as_index=False, observed=True)
        .agg(
            account_count=("account_id", "nunique"),
            impressions=("impressions", "sum"),
            clicks=("clicks", "sum"),
            spend=("platform_spend", "sum"),
            mixed_revenue_24h=("mixed_revenue_24h", "sum"),
            plays=("plays", "sum"),
        )
    )
    result["weighted_mixed_roi"] = safe_divide(
        result["mixed_revenue_24h"], result["spend"]
    )
    result["weighted_ctr"] = safe_divide(result["clicks"], result["impressions"])
    result["weighted_play_rate"] = safe_divide(
        result["plays"], result["impressions"]
    )
    return result.sort_values("account_count", ascending=False).reset_index(drop=True)


def _dashboard_payload(
    source: pd.DataFrame,
    brands: pd.DataFrame,
    segmented: pd.DataFrame,
    pareto: pd.DataFrame,
    correlations: pd.DataFrame,
    parameters: dict[str, float | int],
) -> dict[str, Any]:
    spend = float(source["platform_spend"].sum())
    revenue = float(source["mixed_revenue_24h"].sum())
    overall = {
        "account_count": int(source["account_id"].nunique()),
        "brand_count": int(source["brand_name"].nunique()),
        "total_spend": spend,
        "mixed_revenue_24h": revenue,
        "weighted_mixed_roi": revenue / spend,
        "weighted_ctr": float(source["clicks"].sum() / source["impressions"].sum()),
        "weighted_cpc": float(spend / source["clicks"].sum()),
        "weighted_cpm": float(spend * 1000 / source["impressions"].sum()),
        "weighted_play_rate": float(source["plays"].sum() / source["impressions"].sum()),
        "weighted_play_cost": float(spend / source["plays"].sum()),
        "eligible_account_count": int(parameters["eligible_accounts"]),
        "eligible_spend_coverage": float(parameters["eligible_spend_coverage"]),
    }
    public_columns = [
        "month_date",
        "account_id",
        "account_name",
        "brand_name",
        "impressions",
        "clicks",
        "platform_spend",
        "mixed_revenue_24h",
        "plays",
        "ctr_recalc",
        "cpc_recalc",
        "cpm_recalc",
        "mixed_roi_recalc",
        "play_cost_recalc",
        "play_rate_recalc",
        "is_eligible",
        "is_high_spend",
        "action_segment",
    ]
    public_accounts = segmented.loc[:, public_columns].copy()
    public_accounts["sample_status"] = np.where(
        public_accounts["is_eligible"], "达到样本门槛", "低于样本门槛"
    )
    correlation_items = pd.DataFrame(
        {
            "metric": ["CTR", "CPC", "播放率", "播放成本"],
            "field": [
                "ctr_recalc",
                "cpc_recalc",
                "play_rate_recalc",
                "play_cost_recalc",
            ],
            "spearman_rho": [
                correlations.loc["ctr_recalc", "mixed_roi_recalc"],
                correlations.loc["cpc_recalc", "mixed_roi_recalc"],
                correlations.loc["play_rate_recalc", "mixed_roi_recalc"],
                correlations.loc["play_cost_recalc", "mixed_roi_recalc"],
            ],
        }
    )
    top_count = int(len(pareto) * 0.10)
    metadata = {
        "analysis_title": "漫剧投放账号效能诊断与预算分层管理",
        "analysis_month": "2026-07",
        "row_count": int(len(source)),
        "source_grain": "账号 × 月",
        "privacy_note": "品牌、账号与金额均经过匿名替换/同比例缩放；仅用于本数据集内相对比较。",
        "scope_note": "单月账号汇总数据，不能用于趋势、素材归因或因果判断。",
        "top_10_percent_account_count": top_count,
        "top_10_percent_spend_share": float(
            pareto.iloc[top_count - 1]["cumulative_spend_share"]
        ),
    }
    return {
        "metadata": metadata,
        "parameters": {key: _json_value(value) for key, value in parameters.items()},
        "overall": overall,
        "brands": _records(brands),
        "segments": _records(_segment_summary(segmented)),
        "accounts": _records(public_accounts),
        "pareto": _records(pareto),
        "correlations": _records(correlation_items),
    }


def run_pipeline(source_path: Path, paths: PipelinePaths) -> dict[str, Any]:
    """Run all analysis steps and return the same receipt written to disk."""

    source_path = Path(source_path)
    paths.processed_dir.mkdir(parents=True, exist_ok=True)
    paths.dashboard_json.parent.mkdir(parents=True, exist_ok=True)
    paths.image_dir.mkdir(parents=True, exist_ok=True)
    paths.receipt_path.parent.mkdir(parents=True, exist_ok=True)

    source = load_source(source_path)
    quality = quality_summary(source)
    brands = brand_summary(source)
    segmented, parameters = segment_accounts(source)
    pareto = build_pareto(source)
    eligible = segmented.loc[segmented["is_eligible"]]
    correlation_fields = [
        "ctr_recalc",
        "cpc_recalc",
        "play_rate_recalc",
        "play_cost_recalc",
        "mixed_roi_recalc",
    ]
    correlations = eligible[correlation_fields].corr(method="spearman")

    csv_targets = {
        "manga_ad_account_2026_07.csv": source,
        "data_quality_summary.csv": quality,
        "brand_summary.csv": brands,
        "account_pareto.csv": pareto,
        "account_segments.csv": segmented.drop(
            columns=["customer_id", "customer_name"], errors="ignore"
        ),
    }
    for filename, frame in csv_targets.items():
        frame.to_csv(paths.processed_dir / filename, index=False, encoding="utf-8-sig")
    correlations.to_csv(
        paths.processed_dir / "correlation_matrix.csv",
        index_label="metric",
        encoding="utf-8-sig",
    )

    payload = _dashboard_payload(
        source, brands, segmented, pareto, correlations, parameters
    )
    with paths.dashboard_json.open("w", encoding="utf-8") as stream:
        json.dump(payload, stream, ensure_ascii=False, indent=2, allow_nan=False)

    figures = create_all_figures(
        brands, pareto, segmented, correlations, paths.image_dir
    )
    expected_spend = 207057.28714
    expected_accounts = 551
    checks = {
        "row_count_is_551": len(source) == expected_accounts,
        "account_count_is_551": source["account_id"].nunique() == expected_accounts,
        "brand_count_is_8": source["brand_name"].nunique() == 8,
        "brand_spend_reconciles": bool(
            np.isclose(brands["spend"].sum(), source["platform_spend"].sum())
        ),
        "segment_count_reconciles": int(len(segmented)) == expected_accounts,
        "spend_matches_verified_source": bool(
            np.isclose(source["platform_spend"].sum(), expected_spend)
        ),
        "dashboard_accounts_are_public_safe": "customer_id"
        not in payload["accounts"][0],
    }
    checks["all_reconciliations_passed"] = all(checks.values())
    receipt: dict[str, Any] = {
        "pipeline_version": "1.0.0",
        "run_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_file": source_path.name,
        "source_sha256": _sha256(source_path),
        "output_counts": {
            "csv_files": 6,
            "figure_files": len(figures),
            "dashboard_accounts": len(payload["accounts"]),
        },
        "parameters": parameters,
        "checks": checks,
    }
    with paths.receipt_path.open("w", encoding="utf-8") as stream:
        json.dump(receipt, stream, ensure_ascii=False, indent=2, allow_nan=False)
    return receipt
