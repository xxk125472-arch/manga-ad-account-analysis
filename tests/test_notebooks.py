import json
import unittest
from pathlib import Path


class NotebookContractTests(unittest.TestCase):
    def test_two_executed_notebooks_have_required_sections(self) -> None:
        paths = [
            Path("notebooks/01_data_quality_audit.ipynb"),
            Path("notebooks/02_account_performance_diagnosis.ipynb"),
        ]
        self.assertTrue(all(path.is_file() for path in paths))

        for path in paths:
            notebook = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(notebook["nbformat"], 4)
            markdown = "\n".join(
                "".join(cell["source"])
                for cell in notebook["cells"]
                if cell["cell_type"] == "markdown"
            )
            for heading in ["TL;DR", "Context & Methods", "Data", "Results", "Takeaways"]:
                self.assertIn(heading, markdown)
            code_cells = [cell for cell in notebook["cells"] if cell["cell_type"] == "code"]
            self.assertTrue(all(cell["execution_count"] is not None for cell in code_cells))
            self.assertFalse(
                any(
                    output.get("output_type") == "error"
                    for cell in code_cells
                    for output in cell["outputs"]
                )
            )


if __name__ == "__main__":
    unittest.main()
