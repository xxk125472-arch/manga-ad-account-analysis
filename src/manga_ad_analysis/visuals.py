"""Static, report-ready figures generated from verified pipeline tables."""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.ticker import PercentFormatter


INK = "#16223A"
MUTED = "#667085"
GRID = "#E4E9F0"
TEAL = "#0F8B8D"
CORAL = "#E76F51"
BLUE = "#3867D6"

SEGMENT_ENGLISH = {
    "核心扩量候选": "Core scale candidate",
    "高消耗重点优化": "High-spend optimization",
    "小步扩量观察": "Controlled scale watch",
    "低效清理候选": "Low-efficiency review",
    "数据不足/低量池": "Low-volume / insufficient data",
}


def _style() -> None:
    plt.rcParams.update(
        {
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "axes.edgecolor": GRID,
            "axes.labelcolor": MUTED,
            "axes.titlecolor": INK,
            "text.color": INK,
            "xtick.color": MUTED,
            "ytick.color": MUTED,
            "font.family": "DejaVu Sans",
            "axes.titleweight": "bold",
            "axes.titlesize": 15,
            "axes.labelsize": 10,
        }
    )


def _save(fig: plt.Figure, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=180, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def plot_brand_roi(brand: pd.DataFrame, path: Path) -> None:
    """Plot weighted mixed ROI by brand with a non-profitability reference line."""

    _style()
    ordered = brand.sort_values("mixed_roi", ascending=True)
    brand_labels = ordered["brand_name"].str.replace("漫剧品牌", "Brand ", regex=False)
    colors = np.where(ordered["mixed_roi"].ge(1.0), TEAL, CORAL)
    fig, ax = plt.subplots(figsize=(9.2, 5.4))
    bars = ax.barh(brand_labels, ordered["mixed_roi"], color=colors, height=0.62)
    ax.axvline(1.0, color=INK, linewidth=1.2, linestyle="--")
    ax.text(1.005, len(ordered) - 0.35, "ROI reference = 1.0", fontsize=9, color=MUTED)
    ax.set_title("Weighted 24h mixed ROI by anonymized brand", loc="left", pad=18)
    ax.text(
        0,
        1.025,
        "July 2026 · ratios recomputed from summed revenue and spend",
        transform=ax.transAxes,
        fontsize=9.5,
        color=MUTED,
    )
    ax.set_xlabel("Weighted mixed ROI (x)")
    ax.bar_label(bars, labels=[f"{value:.3f}" for value in ordered["mixed_roi"]], padding=5, fontsize=9)
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    for spine in ["top", "right", "left"]:
        ax.spines[spine].set_visible(False)
    _save(fig, path)


def plot_pareto(pareto: pd.DataFrame, path: Path) -> None:
    """Plot cumulative spend against cumulative account share."""

    _style()
    fig, ax = plt.subplots(figsize=(9.2, 5.4))
    x = pareto["account_share"]
    y = pareto["cumulative_spend_share"]
    ax.plot(x, y, color=BLUE, linewidth=2.5)
    top_count = int(len(pareto) * 0.10)
    top_share = float(pareto.iloc[top_count - 1]["cumulative_spend_share"])
    ax.scatter([top_count / len(pareto)], [top_share], s=62, color=CORAL, zorder=3)
    ax.annotate(
        f"Top 10% of accounts\n{top_share:.1%} of spend",
        xy=(top_count / len(pareto), top_share),
        xytext=(0.23, 0.53),
        arrowprops={"arrowstyle": "-", "color": CORAL},
        fontsize=10,
        color=INK,
    )
    ax.plot([0, 1], [0, 1], color=GRID, linewidth=1, linestyle="--")
    ax.set_title("Account spend concentration", loc="left", pad=18)
    ax.text(
        0,
        1.025,
        "551 anonymized accounts · sorted by platform spend",
        transform=ax.transAxes,
        fontsize=9.5,
        color=MUTED,
    )
    ax.set_xlabel("Cumulative share of accounts")
    ax.set_ylabel("Cumulative share of spend")
    ax.xaxis.set_major_formatter(PercentFormatter(1.0))
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    ax.set_xlim(0, 1.01)
    ax.set_ylim(0, 1.03)
    ax.grid(color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    for spine in ["top", "right"]:
        ax.spines[spine].set_visible(False)
    _save(fig, path)


def plot_segments(segmented: pd.DataFrame, path: Path) -> None:
    """Plot account counts for the five operational review queues."""

    _style()
    order = [
        "数据不足/低量池",
        "小步扩量观察",
        "低效清理候选",
        "核心扩量候选",
        "高消耗重点优化",
    ]
    counts = segmented["action_segment"].value_counts().reindex(order)
    labels = [SEGMENT_ENGLISH[item] for item in order]
    colors = ["#AAB4C3", "#7AA6C2", CORAL, TEAL, "#F4A261"]
    fig, ax = plt.subplots(figsize=(9.2, 5.4))
    bars = ax.barh(labels, counts.values, color=colors, height=0.62)
    ax.invert_yaxis()
    ax.set_title("Operational account review queues", loc="left", pad=18)
    ax.text(
        0,
        1.025,
        "Spend floor = 50 · weighted mixed ROI reference = 1.0",
        transform=ax.transAxes,
        fontsize=9.5,
        color=MUTED,
    )
    ax.set_xlabel("Account count")
    ax.bar_label(bars, labels=[f"{int(value)}" for value in counts.values], padding=5, fontsize=10)
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    for spine in ["top", "right", "left"]:
        ax.spines[spine].set_visible(False)
    _save(fig, path)


def plot_correlations(correlations: pd.DataFrame, path: Path) -> None:
    """Plot eligible-account Spearman associations with mixed ROI."""

    _style()
    label_map = {
        "ctr_recalc": "CTR",
        "cpc_recalc": "CPC",
        "play_rate_recalc": "Play rate",
        "play_cost_recalc": "Play cost",
    }
    values = correlations.loc[list(label_map), "mixed_roi_recalc"].sort_values()
    colors = np.where(values.ge(0), TEAL, CORAL)
    fig, ax = plt.subplots(figsize=(9.2, 5.4))
    bars = ax.barh([label_map[item] for item in values.index], values.values, color=colors, height=0.56)
    ax.axvline(0, color=INK, linewidth=1)
    ax.set_title("Eligible-account association with mixed ROI", loc="left", pad=18)
    ax.text(
        0,
        1.025,
        "Spearman correlation · n = 283 · descriptive, not causal",
        transform=ax.transAxes,
        fontsize=9.5,
        color=MUTED,
    )
    ax.set_xlabel("Spearman rho")
    ax.set_xlim(-0.18, 0.18)
    ax.bar_label(bars, labels=[f"{value:+.3f}" for value in values], padding=5, fontsize=10)
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    for spine in ["top", "right", "left"]:
        ax.spines[spine].set_visible(False)
    _save(fig, path)


def create_all_figures(
    brand: pd.DataFrame,
    pareto: pd.DataFrame,
    segmented: pd.DataFrame,
    correlations: pd.DataFrame,
    image_dir: Path,
) -> list[Path]:
    """Generate the four canonical report figures."""

    targets = [
        image_dir / "brand_weighted_roi.png",
        image_dir / "account_pareto.png",
        image_dir / "action_segments.png",
        image_dir / "roi_correlations.png",
    ]
    plot_brand_roi(brand, targets[0])
    plot_pareto(pareto, targets[1])
    plot_segments(segmented, targets[2])
    plot_correlations(correlations, targets[3])
    return targets
