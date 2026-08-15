#!/usr/bin/env node

import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error("Usage: print_to_pdf.mjs INPUT_HTML OUTPUT_PDF");
}

const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if (!runtimeModules) {
  throw new Error("CODEX_PRIMARY_RUNTIME_NODE_MODULES is required");
}
const requireFromRuntime = createRequire(path.join(runtimeModules, "package.json"));
const { chromium } = requireFromRuntime("playwright-core");
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/tmp/codex-chromium-149";

await fs.access(executablePath);
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
  await page.goto(pathToFileURL(path.resolve(inputPath)).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: path.resolve(outputPath),
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });
} finally {
  await browser.close();
}
