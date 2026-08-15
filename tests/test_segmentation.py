import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from manga_ad_analysis.io import load_source
from manga_ad_analysis.segmentation import build_pareto, segment_accounts


class SegmentationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.frame = load_source(
            Path("data/processed/manga_ad_account_2026_07_anonymized.xlsx")
        )

    def test_segmentation_is_exhaustive_and_uses_five_labels(self) -> None:
        segmented, parameters = segment_accounts(self.frame)

        self.assertEqual(len(segmented), 551)
        self.assertEqual(int(segmented["action_segment"].isna().sum()), 0)
        self.assertEqual(
            set(segmented["action_segment"]),
            {
                "核心扩量候选",
                "高消耗重点优化",
                "小步扩量观察",
                "低效清理候选",
                "数据不足/低量池",
            },
        )
        self.assertEqual(parameters["eligible_accounts"], 283)
        self.assertAlmostEqual(parameters["eligible_spend_coverage"], 0.9943377700143088)
        self.assertAlmostEqual(parameters["high_spend_threshold"], 735.80492)

    def test_segmentation_counts_match_source_evidence(self) -> None:
        segmented, _ = segment_accounts(self.frame)

        self.assertEqual(
            segmented["action_segment"].value_counts().to_dict(),
            {
                "数据不足/低量池": 268,
                "小步扩量观察": 137,
                "低效清理候选": 75,
                "核心扩量候选": 62,
                "高消耗重点优化": 9,
            },
        )

    def test_zero_spend_accounts_stay_in_low_volume_pool(self) -> None:
        segmented, _ = segment_accounts(self.frame)
        zero_spend = segmented[segmented["platform_spend"] == 0]

        self.assertTrue((zero_spend["action_segment"] == "数据不足/低量池").all())
        self.assertTrue(zero_spend["mixed_roi_recalc"].isna().all())

    def test_pareto_is_sorted_and_reconciles_to_one(self) -> None:
        pareto = build_pareto(self.frame)

        self.assertTrue(pareto["spend"].is_monotonic_decreasing)
        self.assertTrue(pareto["cumulative_spend_share"].is_monotonic_increasing)
        self.assertAlmostEqual(float(pareto.iloc[-1]["cumulative_spend_share"]), 1.0)
        self.assertEqual(int(pareto.iloc[0]["spend_rank"]), 1)

    def test_top_ten_percent_definition_matches_documented_concentration(self) -> None:
        pareto = build_pareto(self.frame)
        top_count = int(len(pareto) * 0.10)
        top_share = float(pareto.iloc[top_count - 1]["cumulative_spend_share"])

        self.assertEqual(top_count, 55)
        self.assertAlmostEqual(top_share, 0.6473735100632693)


if __name__ == "__main__":
    unittest.main()
