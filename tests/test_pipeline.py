import json
import sys
import tempfile
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from manga_ad_analysis.pipeline import PipelinePaths, run_pipeline


class PipelineTests(unittest.TestCase):
    def test_pipeline_writes_reconciled_public_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            paths = PipelinePaths(
                processed_dir=root / "processed",
                dashboard_json=root / "web" / "dashboard.json",
                image_dir=root / "images",
                receipt_path=root / "outputs" / "pipeline_receipt.json",
            )

            receipt = run_pipeline(
                Path("data/processed/manga_ad_account_2026_07_anonymized.xlsx"),
                paths,
            )

            expected_csvs = {
                "manga_ad_account_2026_07.csv",
                "data_quality_summary.csv",
                "brand_summary.csv",
                "account_pareto.csv",
                "account_segments.csv",
                "correlation_matrix.csv",
            }
            self.assertEqual(
                {path.name for path in paths.processed_dir.glob("*.csv")},
                expected_csvs,
            )
            self.assertTrue(paths.dashboard_json.is_file())
            self.assertTrue(paths.receipt_path.is_file())
            self.assertEqual(len(list(paths.image_dir.glob("*.png"))), 4)

            with paths.dashboard_json.open(encoding="utf-8") as stream:
                dashboard = json.load(stream)
            public_account = dashboard["accounts"][0]
            self.assertNotIn("customer_id", public_account)
            self.assertNotIn("customer_name", public_account)
            self.assertEqual(dashboard["metadata"]["row_count"], 551)
            self.assertEqual(dashboard["overall"]["account_count"], 551)
            self.assertAlmostEqual(dashboard["overall"]["weighted_mixed_roi"], 1.029986739156888)
            self.assertEqual(sum(item["account_count"] for item in dashboard["segments"]), 551)

            segment_csv = pd.read_csv(paths.processed_dir / "account_segments.csv")
            self.assertEqual(len(segment_csv), 551)
            self.assertAlmostEqual(float(segment_csv["platform_spend"].sum()), 207057.28714, places=5)
            self.assertEqual(receipt["checks"]["all_reconciliations_passed"], True)


if __name__ == "__main__":
    unittest.main()
