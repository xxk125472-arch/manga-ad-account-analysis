#!/usr/bin/env python3
"""Execute notebook code cells with the standard library and persist stdout."""

from __future__ import annotations

import argparse
import io
import json
import os
import traceback
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def execute_notebook(path: Path) -> None:
    notebook = json.loads(path.read_text(encoding="utf-8"))
    namespace: dict[str, object] = {"__name__": "__main__"}
    execution_count = 0
    original_cwd = Path.cwd()
    os.chdir(PROJECT_ROOT)
    try:
        for cell in notebook["cells"]:
            if cell["cell_type"] != "code":
                continue
            execution_count += 1
            cell["execution_count"] = execution_count
            cell["outputs"] = []
            stdout = io.StringIO()
            stderr = io.StringIO()
            source = "".join(cell["source"])
            try:
                with redirect_stdout(stdout), redirect_stderr(stderr):
                    exec(compile(source, f"{path.name}:cell-{execution_count}", "exec"), namespace)
            except Exception as exc:
                cell["outputs"].append(
                    {
                        "output_type": "error",
                        "ename": type(exc).__name__,
                        "evalue": str(exc),
                        "traceback": traceback.format_exc().splitlines(),
                    }
                )
                path.write_text(
                    json.dumps(notebook, ensure_ascii=False, indent=1), encoding="utf-8"
                )
                raise
            for name, content in [("stdout", stdout.getvalue()), ("stderr", stderr.getvalue())]:
                if content:
                    cell["outputs"].append(
                        {"name": name, "output_type": "stream", "text": content.splitlines(keepends=True)}
                    )
    finally:
        os.chdir(original_cwd)

    path.write_text(json.dumps(notebook, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"executed {path.relative_to(PROJECT_ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="*", type=Path)
    args = parser.parse_args()
    paths = args.paths or sorted((PROJECT_ROOT / "notebooks").glob("*.ipynb"))
    for path in paths:
        execute_notebook(path if path.is_absolute() else PROJECT_ROOT / path)


if __name__ == "__main__":
    main()
