"""Source workbook loading and schema validation."""

from __future__ import annotations

from pathlib import Path

import pandas as pd


SOURCE_SHEET = "脱敏数据"

COLUMN_MAP = {
    "日期": "month_date",
    "账号id": "account_id",
    "账号名称": "account_name",
    "客户id": "customer_id",
    "客户名称": "customer_name",
    "品牌名称": "brand_name",
    "展示量": "impressions",
    "点击量": "clicks",
    "三连投放总消耗(毫分)": "platform_spend",
    "整体实收总消耗": "actual_spend",
    "点击率": "ctr",
    "千次展示价格": "cpm",
    "单次点击价格": "cpc",
    "应用内累计付费金额": "in_app_total_payment",
    "激活后24小时付费金额": "payment_24h",
    "激活后24小时变现金额": "revenue_24h",
    "激活后24小时变现ROI": "roi_24h",
    "激活24小时内混合变现金额": "mixed_revenue_24h",
    "激活24小时内混合变现ROI": "mixed_roi_24h",
    "播放量": "plays",
    "播放成本": "play_cost",
    "播放率": "play_rate",
}

IDENTIFIER_COLUMNS = [
    "account_id",
    "account_name",
    "customer_id",
    "customer_name",
    "brand_name",
]

INTEGER_COLUMNS = ["impressions", "clicks", "plays"]

NUMERIC_COLUMNS = [
    "platform_spend",
    "actual_spend",
    "ctr",
    "cpm",
    "cpc",
    "in_app_total_payment",
    "payment_24h",
    "revenue_24h",
    "roi_24h",
    "mixed_revenue_24h",
    "mixed_roi_24h",
    "play_cost",
    "play_rate",
]


class SourceDataError(ValueError):
    """Raised when the supplied workbook cannot satisfy the source contract."""


def load_source(path: str | Path) -> pd.DataFrame:
    """Load the anonymized workbook and return canonical English columns."""

    workbook_path = Path(path)
    if not workbook_path.is_file():
        raise SourceDataError(f"找不到数据文件：{workbook_path}")

    try:
        with pd.ExcelFile(workbook_path) as workbook:
            sheet_names = list(workbook.sheet_names)
            if SOURCE_SHEET not in sheet_names:
                raise SourceDataError(
                    f"缺少工作表“{SOURCE_SHEET}”；现有工作表：{sheet_names}"
                )
            source = pd.read_excel(workbook, sheet_name=SOURCE_SHEET)
    except SourceDataError:
        raise
    except Exception as exc:  # pragma: no cover - pandas supplies varied engines/errors
        raise SourceDataError(f"无法读取数据文件：{workbook_path}") from exc
    missing_columns = [column for column in COLUMN_MAP if column not in source.columns]
    if missing_columns:
        raise SourceDataError(f"缺少必需字段：{missing_columns}")

    frame = source.loc[:, list(COLUMN_MAP)].rename(columns=COLUMN_MAP).copy()
    frame["month_date"] = pd.to_datetime(frame["month_date"], errors="raise")

    for column in IDENTIFIER_COLUMNS:
        frame[column] = frame[column].astype("string").str.strip()

    for column in INTEGER_COLUMNS:
        frame[column] = pd.to_numeric(frame[column], errors="raise").astype("int64")

    for column in NUMERIC_COLUMNS:
        frame[column] = pd.to_numeric(frame[column], errors="raise").astype("float64")

    return frame
