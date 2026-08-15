import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from manga_ad_analysis.io import load_source
from manga_ad_analysis.quality import quality_summary


class DataQualityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.frame = load_source(
            Path("data/processed/manga_ad_account_2026_07_anonymized.xlsx")
        )

    def test_quality_profile_matches_verified_source(self) -> None:
        result = quality_summary(self.frame).set_index("check_name")["value"].to_dict()

        self.assertEqual(result["row_count"], 551)
        self.assertEqual(result["column_count"], 22)
        self.assertEqual(result["account_count"], 551)
        self.assertEqual(result["brand_count"], 8)
        self.assertEqual(result["missing_cells"], 0)
        self.assertEqual(result["duplicate_rows"], 0)
        self.assertEqual(result["duplicate_account_month_keys"], 0)
        self.assertEqual(result["zero_impression_accounts"], 17)
        self.assertEqual(result["zero_click_accounts"], 83)
        self.assertEqual(result["zero_spend_accounts"], 17)
        self.assertEqual(result["zero_play_accounts"], 82)
        self.assertEqual(result["negative_measure_cells"], 0)
        self.assertEqual(result["click_gt_impressions"], 0)
        self.assertEqual(result["play_gt_impressions"], 0)
        self.assertEqual(result["play_cost_formula_mismatch_accounts"], 469)
        self.assertEqual(result["play_cost_matches_inverse_definition_accounts"], 534)

    def test_quality_profile_labels_only_explainable_zero_denominators(self) -> None:
        summary = quality_summary(self.frame).set_index("check_name")

        self.assertEqual(summary.loc["duplicate_account_month_keys", "status"], "通过")
        self.assertEqual(summary.loc["negative_measure_cells", "status"], "通过")
        self.assertEqual(summary.loc["zero_impression_accounts", "status"], "注意")
        self.assertEqual(summary.loc["zero_click_accounts", "status"], "注意")
        self.assertEqual(
            summary.loc["play_cost_formula_mismatch_accounts", "status"], "未通过"
        )


if __name__ == "__main__":
    unittest.main()
