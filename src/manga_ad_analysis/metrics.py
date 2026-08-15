"""Metric definitions with explicit denominator handling and weighted rollups."""

from __future__ import annotations

import numpy as np
import pandas as pd


def safe_divide(numerator: object, denominator: object) -> object:
    """Divide while returning NaN when the denominator is zero or missing."""

    numerator_is_scalar = np.isscalar(numerator)
    denominator_is_scalar = np.isscalar(denominator)
    if numerator_is_scalar and denominator_is_scalar:
        if pd.isna(denominator) or float(denominator) == 0:
            return float("nan")
        return float(numerator) / float(denominator)

    if denominator_is_scalar:
        numerator_series = pd.Series(numerator, copy=False, dtype="float64")
        if pd.isna(denominator) or float(denominator) == 0:
            return pd.Series(np.nan, index=numerator_series.index, dtype="float64")
        return numerator_series / float(denominator)

    if numerator_is_scalar:
        denominator_series = pd.Series(denominator, copy=False, dtype="float64")
        result = float(numerator) / denominator_series
        return result.where(denominator_series.ne(0) & denominator_series.notna())

    numerator_series = pd.Series(numerator, copy=False, dtype="float64")
    denominator_series = pd.Series(denominator, copy=False, dtype="float64")
    result = numerator_series.div(denominator_series)
    return result.where(denominator_series.ne(0) & denominator_series.notna())


def add_account_metrics(frame: pd.DataFrame) -> pd.DataFrame:
    """Recalculate account-level ratios from additive base measures."""

    enriched = frame.copy()
    enriched["ctr_recalc"] = safe_divide(enriched["clicks"], enriched["impressions"])
    enriched["cpc_recalc"] = safe_divide(
        enriched["platform_spend"], enriched["clicks"]
    )
    enriched["cpm_recalc"] = (
        safe_divide(enriched["platform_spend"], enriched["impressions"]) * 1000
    )
    enriched["roi_24h_recalc"] = safe_divide(
        enriched["revenue_24h"], enriched["platform_spend"]
    )
    enriched["mixed_roi_recalc"] = safe_divide(
        enriched["mixed_revenue_24h"], enriched["platform_spend"]
    )
    enriched["play_cost_recalc"] = safe_divide(
        enriched["platform_spend"], enriched["plays"]
    )
    enriched["play_rate_recalc"] = safe_divide(
        enriched["plays"], enriched["impressions"]
    )
    return enriched


def brand_summary(frame: pd.DataFrame) -> pd.DataFrame:
    """Aggregate brands and calculate ratios from summed numerators/denominators."""

    grouped = (
        frame.groupby("brand_name", as_index=False, observed=True)
        .agg(
            account_count=("account_id", "nunique"),
            impressions=("impressions", "sum"),
            clicks=("clicks", "sum"),
            spend=("platform_spend", "sum"),
            actual_spend=("actual_spend", "sum"),
            mixed_revenue_24h=("mixed_revenue_24h", "sum"),
            revenue_24h=("revenue_24h", "sum"),
            plays=("plays", "sum"),
        )
        .sort_values(["spend", "brand_name"], ascending=[False, True])
        .reset_index(drop=True)
    )
    grouped["ctr"] = safe_divide(grouped["clicks"], grouped["impressions"])
    grouped["cpc"] = safe_divide(grouped["spend"], grouped["clicks"])
    grouped["cpm"] = safe_divide(grouped["spend"], grouped["impressions"]) * 1000
    grouped["mixed_roi"] = safe_divide(
        grouped["mixed_revenue_24h"], grouped["spend"]
    )
    grouped["roi_24h"] = safe_divide(grouped["revenue_24h"], grouped["spend"])
    grouped["play_rate"] = safe_divide(grouped["plays"], grouped["impressions"])
    grouped["play_cost"] = safe_divide(grouped["spend"], grouped["plays"])
    grouped["spend_share"] = safe_divide(grouped["spend"], grouped["spend"].sum())
    return grouped
