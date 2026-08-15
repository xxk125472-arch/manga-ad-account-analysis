#!/usr/bin/env python3
"""Build the two portfolio notebooks without requiring nbformat at runtime."""

from __future__ import annotations

import json
from pathlib import Path
from textwrap import dedent


PROJECT_ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK_DIR = PROJECT_ROOT / "notebooks"


def _source(text: str) -> list[str]:
    return dedent(text).strip().splitlines(keepends=True)


def markdown(text: str) -> dict[str, object]:
    return {"cell_type": "markdown", "metadata": {}, "source": _source(text)}


def code(text: str) -> dict[str, object]:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": _source(text),
    }


def notebook(cells: list[dict[str, object]]) -> dict[str, object]:
    return {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3",
            },
            "language_info": {"name": "python", "version": "3.10+"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


QUALITY_CELLS = [
    markdown(
        """
        # 漫剧投放数据质量审计

        ## TL;DR

        - 2026 年 7 月数据包含 551 行、551 个匿名账号、8 个匿名品牌和 22 个源字段。
        - 主键重复、缺失、负值、点击大于展示、播放大于展示均为 0。
        - 零展示 17 个、零点击 83 个、零消耗 17 个、零播放 82 个；比率采用安全除法，不删除这些账号。
        - 源“播放成本”字段实际等于播放量÷消耗；最终分析改用消耗÷播放量的重算字段。
        """
    ),
    markdown(
        """
        ## Context & Methods

        数据粒度是“账号 × 月”，只做单月横截面诊断。检查结构完整性、唯一性、数值边界、零分母和源指标公式。所有金额经过同比例缩放，绝对值只用于本数据集内比较。

        ## Data

        唯一输入是 `data/processed/manga_ad_account_2026_07_anonymized.xlsx` 的 `脱敏数据` 工作表。
        """
    ),
    code(
        """
        from pathlib import Path
        import sys
        import pandas as pd

        PROJECT_ROOT = Path.cwd()
        if not (PROJECT_ROOT / "src").exists():
            PROJECT_ROOT = PROJECT_ROOT.parent
        sys.path.insert(0, str(PROJECT_ROOT / "src"))

        from manga_ad_analysis.io import load_source
        from manga_ad_analysis.metrics import add_account_metrics
        from manga_ad_analysis.quality import quality_summary

        source_path = PROJECT_ROOT / "data/processed/manga_ad_account_2026_07_anonymized.xlsx"
        frame = load_source(source_path)
        enriched = add_account_metrics(frame)
        print(f"rows={len(frame)}, accounts={frame.account_id.nunique()}, brands={frame.brand_name.nunique()}, columns={frame.shape[1]}")
        """
    ),
    markdown("## Results\n\n### 1. 结构与业务规则检查"),
    code(
        """
        audit = quality_summary(frame)
        print(audit.to_string(index=False))
        """
    ),
    markdown("### 2. 源指标与重算指标复核"),
    code(
        """
        valid = enriched[enriched["plays"] > 0].copy()
        mismatch_count = (abs(valid["play_cost"] - valid["play_cost_recalc"]) > 1e-6).sum()
        inverse_matches = (
            abs(
                enriched.loc[enriched["platform_spend"] > 0, "play_cost"]
                - enriched.loc[enriched["platform_spend"] > 0, "plays"]
                / enriched.loc[enriched["platform_spend"] > 0, "platform_spend"]
            ) <= 1e-6
        ).sum()
        print(f"播放成本公式不一致账号（plays>0）：{mismatch_count}")
        print(f"源字段匹配 plays/spend 的账号（spend>0）：{inverse_matches}")
        print(enriched[["account_id", "platform_spend", "plays", "play_cost", "play_cost_recalc"]].head(8).to_string(index=False))
        """
    ),
    markdown(
        """
        ## Takeaways

        1. 数据结构完整，可以进入汇总与分层；零分母需要保留并显式标记。
        2. 品牌 KPI 必须从基础量加权重算，不能直接平均账号比率。
        3. 源“播放成本”字段名与实际公式冲突，因此下游统一使用 `play_cost_recalc`。
        4. 本次审计不能补齐日/周趋势、素材归因、留存或利润数据。
        """
    ),
]


DIAGNOSIS_CELLS = [
    markdown(
        """
        # 漫剧投放账号效能诊断与行动分层

        ## TL;DR

        - 总消耗 207057.29，24h 混合变现 213266.26，加权混合 ROI 为 1.030x。
        - 达到消耗 50 门槛的账号 283 个，覆盖 99.4% 消耗；Top 55 账号贡献 64.7% 消耗。
        - 五类行动池：核心扩量候选 62、高消耗重点优化 9、小步扩量观察 137、低效清理候选 75、数据不足/低量池 268。
        - CTR、CPC、播放率、重算播放成本与混合 ROI 的秩相关均较弱，只能作为待验证线索。
        """
    ),
    markdown(
        """
        ## Context & Methods

        使用安全除法、品牌加权聚合、账号消耗 Pareto 和“消耗 × 混合 ROI”规则分层。消耗门槛为 50；有效账号的高消耗边界为 P75；ROI=1 仅表示本口径下变现金额覆盖投放消耗。

        ## Data

        使用同一深度脱敏单月账号表；客户字段不会进入公开网页数据。
        """
    ),
    code(
        """
        from pathlib import Path
        import sys
        import pandas as pd

        PROJECT_ROOT = Path.cwd()
        if not (PROJECT_ROOT / "src").exists():
            PROJECT_ROOT = PROJECT_ROOT.parent
        sys.path.insert(0, str(PROJECT_ROOT / "src"))

        from manga_ad_analysis.io import load_source
        from manga_ad_analysis.metrics import brand_summary
        from manga_ad_analysis.segmentation import build_pareto, segment_accounts

        frame = load_source(PROJECT_ROOT / "data/processed/manga_ad_account_2026_07_anonymized.xlsx")
        brands = brand_summary(frame)
        segmented, parameters = segment_accounts(frame)
        pareto = build_pareto(frame)
        print(parameters)
        """
    ),
    markdown("## Results\n\n### 1. 品牌规模与效率"),
    code(
        """
        columns = ["brand_name", "account_count", "spend", "spend_share", "ctr", "play_rate", "mixed_roi"]
        print(brands[columns].round(4).to_string(index=False))
        """
    ),
    markdown("![品牌加权混合 ROI](../images/brand_weighted_roi.png)"),
    markdown("### 2. 预算集中度"),
    code(
        """
        top_count = int(len(pareto) * 0.10)
        top_share = pareto.iloc[top_count - 1]["cumulative_spend_share"]
        print(f"Top {top_count} / {len(pareto)} accounts spend share = {top_share:.4%}")
        print(pareto.head(10).round(4).to_string(index=False))
        """
    ),
    markdown("![账号消耗 Pareto](../images/account_pareto.png)"),
    markdown("### 3. 五类行动池"),
    code(
        """
        segment_counts = segmented["action_segment"].value_counts()
        print(segment_counts.to_string())
        print()
        print("High-spend optimization review queue:")
        columns = ["account_id", "account_name", "brand_name", "platform_spend", "mixed_roi_recalc", "play_cost_recalc"]
        print(segmented[segmented["action_segment"] == "高消耗重点优化"][columns].sort_values("platform_spend", ascending=False).round(4).to_string(index=False))
        """
    ),
    markdown("![账号行动分层](../images/action_segments.png)"),
    markdown("### 4. 相关性探索（非因果）"),
    code(
        """
        eligible = segmented[segmented["is_eligible"]]
        fields = ["ctr_recalc", "cpc_recalc", "play_rate_recalc", "play_cost_recalc", "mixed_roi_recalc"]
        correlations = eligible[fields].corr(method="spearman")
        print(correlations[["mixed_roi_recalc"]].drop(index="mixed_roi_recalc").round(4).to_string())
        """
    ),
    markdown("![混合 ROI 相关性](../images/roi_correlations.png)"),
    markdown(
        """
        ## Takeaways

        - 预算高度集中，优先把人工核查放在高消耗账号而不是平均覆盖全部 551 个账号。
        - 9 个“高消耗重点优化”账号应先检查素材、计划配置和落地链路；62 个“核心扩量候选”只建议小幅、带上限地验证。
        - 268 个低量账号不适合直接判定好坏，应先补足样本。
        - 单月横截面和弱相关性不足以支持“某指标导致 ROI 变化”的结论；下一步需补多月、素材/计划粒度和利润口径。
        """
    ),
]


def main() -> None:
    NOTEBOOK_DIR.mkdir(parents=True, exist_ok=True)
    targets = {
        "01_data_quality_audit.ipynb": notebook(QUALITY_CELLS),
        "02_account_performance_diagnosis.ipynb": notebook(DIAGNOSIS_CELLS),
    }
    for filename, payload in targets.items():
        (NOTEBOOK_DIR / filename).write_text(
            json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8"
        )
        print(f"built {filename}")


if __name__ == "__main__":
    main()
