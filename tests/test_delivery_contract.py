import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DeliveryContractTests(unittest.TestCase):
    def test_power_bi_pack_contains_auditable_weighted_measures(self):
        dax_path = ROOT / "powerbi" / "measures.dax"
        self.assertTrue(dax_path.exists())
        dax = dax_path.read_text(encoding="utf-8")
        self.assertIn("DIVIDE([总点击], [总展示])", dax)
        self.assertIn("DIVIDE([总消耗], [总播放])", dax)
        self.assertIn("高消耗边界", dax)
        self.assertNotIn("AVERAGE('账户投放'[mixed_roi_24h])", dax)

    def test_power_bi_theme_is_valid_json(self):
        theme_path = ROOT / "powerbi" / "theme.json"
        theme = json.loads(theme_path.read_text(encoding="utf-8"))
        self.assertEqual(theme["name"], "Manga Ad Operations Editorial")
        self.assertIn("#1B2A4A", theme["dataColors"])

    def test_github_pages_workflow_builds_web_directory(self):
        workflow = (ROOT / ".github" / "workflows" / "deploy-pages.yml").read_text(
            encoding="utf-8"
        )
        self.assertIn("working-directory: web", workflow)
        self.assertIn("actions/deploy-pages", workflow)
        self.assertIn("path: web/dist", workflow)


if __name__ == "__main__":
    unittest.main()
