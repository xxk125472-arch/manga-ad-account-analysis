"""Auditable data-quality checks for the anonymized account-month extract."""

from __future__ import annotations

import numpy as np
import pandas as pd


MEASURE_COLUMNS = [
    "impressions",
    "clicks",
    "platform_spend",
    "actual_spend",
    "in_app_total_payment",
    "payment_24h",
    "revenue_24h",
    "mixed_revenue_24h",
    "plays",
]


def _status(value: int, *, attention_only: bool = False) -> tuple[str, str]:
    """Return a Chinese status/severity pair for a count-based check."""

    if value == 0:
        return "通过", "正常"
    if attention_only:
        return "注意", "提示"
    return "未通过", "错误"


def quality_summary(frame: pd.DataFrame) -> pd.DataFrame:
    """Return one row per quality check, including result and interpretation.

    Zeros in denominator fields are flagged for interpretation rather than treated
    as invalid records. Structural conflicts and negative measures are failures.
    """

    duplicate_keys = int(
        frame.duplicated(subset=["month_date", "account_id"], keep=False).sum()
    )
    positive_plays = frame["plays"].gt(0)
    expected_play_cost = frame.loc[positive_plays, "platform_spend"].div(
        frame.loc[positive_plays, "plays"]
    )
    play_cost_mismatches = int(
        (~np.isclose(frame.loc[positive_plays, "play_cost"], expected_play_cost)).sum()
    )
    positive_spend = frame["platform_spend"].gt(0)
    inverse_play_efficiency = frame.loc[positive_spend, "plays"].div(
        frame.loc[positive_spend, "platform_spend"]
    )
    inverse_matches = int(
        np.isclose(
            frame.loc[positive_spend, "play_cost"], inverse_play_efficiency
        ).sum()
    )
    values: list[tuple[str, int, str, bool]] = [
        ("row_count", int(len(frame)), "数据行数", True),
        ("column_count", int(frame.shape[1]), "规范字段数", True),
        ("account_count", int(frame["account_id"].nunique()), "唯一账号数", True),
        ("brand_count", int(frame["brand_name"].nunique()), "品牌数", True),
        ("missing_cells", int(frame.isna().sum().sum()), "缺失单元格数", False),
        ("duplicate_rows", int(frame.duplicated().sum()), "完全重复行数", False),
        (
            "duplicate_account_month_keys",
            duplicate_keys,
            "账号—月份复合键重复行数",
            False,
        ),
        (
            "zero_impression_accounts",
            int((frame["impressions"] == 0).sum()),
            "展示量为 0 的账号数；对应比率按空值处理",
            True,
        ),
        (
            "zero_click_accounts",
            int((frame["clicks"] == 0).sum()),
            "点击量为 0 的账号数；CPC 需结合消耗解读",
            True,
        ),
        (
            "zero_spend_accounts",
            int((frame["platform_spend"] == 0).sum()),
            "平台消耗为 0 的账号数；ROI 按空值处理",
            True,
        ),
        (
            "zero_play_accounts",
            int((frame["plays"] == 0).sum()),
            "播放量为 0 的账号数；播放成本需谨慎解读",
            True,
        ),
        (
            "negative_measure_cells",
            int((frame[MEASURE_COLUMNS] < 0).sum().sum()),
            "核心数量/金额字段中的负值单元格数",
            False,
        ),
        (
            "click_gt_impressions",
            int((frame["clicks"] > frame["impressions"]).sum()),
            "点击量大于展示量的账号数",
            False,
        ),
        (
            "play_gt_impressions",
            int((frame["plays"] > frame["impressions"]).sum()),
            "播放量大于展示量的账号数",
            False,
        ),
        (
            "play_cost_formula_mismatch_accounts",
            play_cost_mismatches,
            "有播放账号中，源“播放成本”不等于消耗÷播放量的账号数；分析改用重算字段",
            False,
        ),
        (
            "play_cost_matches_inverse_definition_accounts",
            inverse_matches,
            "有消耗账号中，源“播放成本”实际等于播放量÷消耗的账号数",
            True,
        ),
    ]

    records: list[dict[str, object]] = []
    informational_checks = {"row_count", "column_count", "account_count", "brand_count"}
    for name, value, description, attention_only in values:
        if name in informational_checks:
            status, severity = "通过", "信息"
        else:
            status, severity = _status(value, attention_only=attention_only)
        records.append(
            {
                "check_name": name,
                "value": value,
                "status": status,
                "severity": severity,
                "description": description,
            }
        )

    return pd.DataFrame.from_records(records)
