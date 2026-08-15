import unittest
from pathlib import Path


class SqlContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.sql_dir = Path("sql")

    def test_required_mysql_scripts_exist(self) -> None:
        self.assertEqual(
            {path.name for path in self.sql_dir.glob("*.sql")},
            {
                "01_create_table.sql",
                "02_data_quality.sql",
                "03_brand_summary.sql",
                "04_account_pareto.sql",
                "05_account_segmentation.sql",
            },
        )

    def test_brand_summary_uses_weighted_formulas(self) -> None:
        sql = (self.sql_dir / "03_brand_summary.sql").read_text(encoding="utf-8").lower()

        self.assertIn("sum(mixed_revenue_24h) / nullif(sum(platform_spend), 0)", sql)
        self.assertIn("sum(clicks) / nullif(sum(impressions), 0)", sql)
        self.assertNotIn("avg(mixed_roi", sql)

    def test_segmentation_contains_exact_five_labels_and_interpolated_p75(self) -> None:
        sql = (self.sql_dir / "05_account_segmentation.sql").read_text(encoding="utf-8")

        for label in [
            "核心扩量候选",
            "高消耗重点优化",
            "小步扩量观察",
            "低效清理候选",
            "数据不足/低量池",
        ]:
            self.assertIn(label, sql)
        self.assertIn("ROW_NUMBER() OVER", sql)
        self.assertIn("FLOOR((eligible_n - 1) * 0.75)", sql)
        self.assertIn("50.0", sql)


if __name__ == "__main__":
    unittest.main()
