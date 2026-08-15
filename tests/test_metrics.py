import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from manga_ad_analysis.io import load_source
from manga_ad_analysis.metrics import add_account_metrics, brand_summary, safe_divide


class MetricTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.frame = load_source(
            Path("data/processed/manga_ad_account_2026_07_anonymized.xlsx")
        )

    def test_safe_divide_returns_nan_for_zero_denominator(self) -> None:
        result = safe_divide(pd.Series([2.0, 1.0]), pd.Series([1.0, 0.0]))

        self.assertEqual(result.iloc[0], 2.0)
        self.assertTrue(pd.isna(result.iloc[1]))

    def test_safe_divide_broadcasts_scalar_denominator(self) -> None:
        numerator = pd.Series([2.0, 3.0], index=[10, 20])

        result = safe_divide(numerator, 5.0)

        self.assertEqual(result.index.tolist(), [10, 20])
        self.assertEqual(result.tolist(), [0.4, 0.6])

    def test_account_metrics_recalculate_from_base_quantities(self) -> None:
        enriched = add_account_metrics(self.frame)
        first = enriched.iloc[0]

        self.assertAlmostEqual(
            first["ctr_recalc"], first["clicks"] / first["impressions"], places=12
        )
        self.assertAlmostEqual(
            first["mixed_roi_recalc"],
            first["mixed_revenue_24h"] / first["platform_spend"],
            places=12,
        )
        self.assertTrue(
            enriched.loc[enriched["impressions"] == 0, "ctr_recalc"].isna().all()
        )

    def test_brand_summary_uses_weighted_ratios(self) -> None:
        summary = brand_summary(self.frame)
        total_spend = float(summary["spend"].sum())
        total_revenue = float(summary["mixed_revenue_24h"].sum())

        self.assertEqual(len(summary), 8)
        self.assertAlmostEqual(total_spend, 207057.28714, places=5)
        self.assertAlmostEqual(total_revenue, 213266.26, places=2)
        self.assertAlmostEqual(total_revenue / total_spend, 1.029986739156888, places=12)

        brand_c = summary.set_index("brand_name").loc["漫剧品牌C"]
        self.assertEqual(int(brand_c["account_count"]), 150)
        self.assertAlmostEqual(float(brand_c["spend"]), 99787.60628, places=5)
        self.assertAlmostEqual(
            float(brand_c["mixed_roi"]), 103947.90 / 99787.60628, places=12
        )

    def test_weighted_brand_roi_is_not_mean_account_roi(self) -> None:
        enriched = add_account_metrics(self.frame)
        brand_c = enriched[enriched["brand_name"] == "漫剧品牌C"]
        simple_mean = float(np.nanmean(brand_c["mixed_roi_recalc"]))
        weighted = float(
            brand_summary(brand_c).iloc[0]["mixed_roi"]
        )

        self.assertGreater(abs(simple_mean - weighted), 0.01)


if __name__ == "__main__":
    unittest.main()
