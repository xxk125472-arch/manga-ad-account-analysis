"""Spend/ROI account segmentation and Pareto concentration analysis."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .metrics import add_account_metrics, safe_divide


SPEND_FLOOR = 50.0
ROI_LINE = 1.0
HIGH_SPEND_QUANTILE = 0.75


def segment_accounts(
    frame: pd.DataFrame,
    *,
    spend_floor: float = SPEND_FLOOR,
    roi_line: float = ROI_LINE,
    high_spend_quantile: float = HIGH_SPEND_QUANTILE,
) -> tuple[pd.DataFrame, dict[str, float | int]]:
    """Assign five mutually exclusive operational labels to every account.

    The high-spend threshold is the 75th percentile among accounts with spend at
    least ``spend_floor``. A label is a review queue, not a causal recommendation.
    """

    segmented = add_account_metrics(frame)
    segmented["is_eligible"] = segmented["platform_spend"].ge(spend_floor)
    eligible_spend = segmented.loc[segmented["is_eligible"], "platform_spend"]
    high_spend_threshold = float(eligible_spend.quantile(high_spend_quantile))
    segmented["is_high_spend"] = segmented["is_eligible"] & segmented[
        "platform_spend"
    ].ge(high_spend_threshold)

    roi = segmented["mixed_roi_recalc"]
    conditions = [
        segmented["is_high_spend"] & roi.ge(roi_line),
        segmented["is_high_spend"] & roi.lt(roi_line),
        segmented["is_eligible"] & ~segmented["is_high_spend"] & roi.ge(roi_line),
        segmented["is_eligible"] & ~segmented["is_high_spend"] & roi.lt(roi_line),
    ]
    choices = [
        "核心扩量候选",
        "高消耗重点优化",
        "小步扩量观察",
        "低效清理候选",
    ]
    segmented["action_segment"] = np.select(
        conditions, choices, default="数据不足/低量池"
    )

    total_spend = float(segmented["platform_spend"].sum())
    parameters: dict[str, float | int] = {
        "spend_floor": float(spend_floor),
        "roi_line": float(roi_line),
        "high_spend_quantile": float(high_spend_quantile),
        "high_spend_threshold": high_spend_threshold,
        "eligible_accounts": int(segmented["is_eligible"].sum()),
        "eligible_spend_coverage": float(eligible_spend.sum() / total_spend),
    }
    return segmented, parameters


def build_pareto(frame: pd.DataFrame) -> pd.DataFrame:
    """Return accounts sorted by spend with cumulative concentration fields."""

    pareto = (
        frame.groupby(
            ["account_id", "account_name", "brand_name"],
            as_index=False,
            observed=True,
        )
        .agg(spend=("platform_spend", "sum"))
        .sort_values(["spend", "account_id"], ascending=[False, True])
        .reset_index(drop=True)
    )
    pareto["spend_rank"] = np.arange(1, len(pareto) + 1)
    pareto["account_share"] = pareto["spend_rank"] / len(pareto)
    pareto["spend_share"] = safe_divide(pareto["spend"], pareto["spend"].sum())
    pareto["cumulative_spend_share"] = pareto["spend_share"].cumsum()
    return pareto
