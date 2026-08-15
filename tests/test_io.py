import sys
import tempfile
import unittest
import warnings
import gc
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from manga_ad_analysis.io import COLUMN_MAP, SourceDataError, load_source


class SourceLoadingTests(unittest.TestCase):
    source_xlsx = Path("data/processed/manga_ad_account_2026_07_anonymized.xlsx")

    def test_load_source_maps_all_22_columns(self) -> None:
        frame = load_source(self.source_xlsx)

        self.assertEqual(frame.shape, (551, 22))
        self.assertEqual(frame["account_id"].nunique(), 551)
        self.assertEqual(frame["brand_name"].nunique(), 8)
        self.assertEqual(
            frame["month_date"].dt.strftime("%Y-%m-%d").unique().tolist(),
            ["2026-07-01"],
        )
        self.assertEqual(set(frame.columns), set(COLUMN_MAP.values()))

    def test_load_source_preserves_identifier_types(self) -> None:
        frame = load_source(self.source_xlsx)

        self.assertEqual(str(frame["account_id"].dtype), "string")
        self.assertEqual(str(frame["customer_id"].dtype), "string")
        self.assertTrue(frame["account_id"].str.startswith("MJ-").all())

    def test_load_source_closes_workbook_handles(self) -> None:
        with warnings.catch_warnings(record=True) as captured:
            warnings.simplefilter("always", ResourceWarning)
            load_source(self.source_xlsx)
            gc.collect()

        resource_warnings = [
            warning
            for warning in captured
            if issubclass(warning.category, ResourceWarning)
        ]
        self.assertEqual(resource_warnings, [])

    def test_load_source_rejects_missing_workbook(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            with self.assertRaisesRegex(SourceDataError, "找不到数据文件"):
                load_source(Path(temp_dir) / "missing.xlsx")

    def test_load_source_rejects_missing_sheet(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workbook = Path(temp_dir) / "wrong_sheet.xlsx"
            pd.DataFrame({"x": [1]}).to_excel(
                workbook, sheet_name="Sheet1", index=False
            )

            with self.assertRaisesRegex(SourceDataError, "缺少工作表.*脱敏数据"):
                load_source(workbook)


if __name__ == "__main__":
    unittest.main()
