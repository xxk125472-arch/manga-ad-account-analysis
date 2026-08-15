import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { createBrotliDecompress } from "node:zlib";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { default: chromiumBinary } = await import(
  "/tmp/chromium-runner/node_modules/@sparticuz/chromium/build/index.js"
);
const execFileAsync = promisify(execFile);

const projectRoot = path.resolve(import.meta.dirname, "..");
const qaDir = path.join(projectRoot, "qa");
const webRoot = path.join(projectRoot, "web", "dist");
await mkdir(qaDir, { recursive: true });
process.env.XDG_CACHE_HOME = "/tmp/codex-browser-cache";
await mkdir(process.env.XDG_CACHE_HOME, { recursive: true });

const chromiumExecutable = "/tmp/codex-chromium-149";
if (!existsSync(chromiumExecutable)) {
  await pipeline(
    createReadStream(
      "/tmp/chromium-runner/node_modules/@sparticuz/chromium/bin/chromium.br",
    ),
    createBrotliDecompress(),
    createWriteStream(chromiumExecutable),
  );
  await chmod(chromiumExecutable, 0o700);
}
if (!existsSync("/tmp/libGLESv2.so")) {
  const swiftshaderTar = "/tmp/codex-swiftshader.tar";
  await pipeline(
    createReadStream(
      "/tmp/chromium-runner/node_modules/@sparticuz/chromium/bin/swiftshader.tar.br",
    ),
    createBrotliDecompress(),
    createWriteStream(swiftshaderTar),
  );
  await execFileAsync("tar", ["--no-same-owner", "-xf", swiftshaderTar, "-C", "/tmp"]);
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
    const filePath = path.resolve(webRoot, relativePath);
    if (!filePath.startsWith(webRoot)) throw new Error("invalid path");
    const body = await readFile(filePath);
    response.writeHead(200, { "content-type": mimeTypes[path.extname(filePath)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});
await new Promise((resolve) => server.listen(4173, "127.0.0.1", resolve));

const browser = await chromium.launch({
  executablePath: chromiumExecutable,
  args: chromiumBinary.args,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const consoleIssues = [];
page.on("console", (message) => {
  if (["warning", "error"].includes(message.type())) {
    consoleIssues.push(`${message.type()}: ${message.text()}`);
  }
});
page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "漫剧投放账号效能诊断" }).waitFor();
assert((await page.locator(".kpi-card").count()) === 5, "桌面端 KPI 卡片数量不是 5");
assert((await page.locator("body").innerText()).includes("20.71万"), "总消耗 KPI 未渲染");
assert((await page.locator("body").innerText()).includes("1.030x"), "混合 ROI KPI 未渲染");
await page.screenshot({ path: path.join(qaDir, "dashboard-desktop.png"), fullPage: true });

await page.getByRole("button", { name: "方法与口径" }).click();
await page.getByRole("dialog", { name: "方法、口径与边界" }).waitFor();
assert((await page.getByText("源字段审计发现").count()) === 1, "方法抽屉缺少源字段审计说明");
await page.getByRole("button", { name: "关闭" }).click();

await page.getByRole("button", { name: "品牌对标" }).click();
await page.getByRole("heading", { name: "品牌规模与效率对标" }).waitFor();
const selects = page.locator("select");
await selects.nth(0).selectOption({ label: "漫剧品牌C" });
await page.waitForTimeout(250);
assert((await page.locator(".kpi-card").nth(4).innerText()).includes("82 / 150"), "品牌筛选未联动有效账号 KPI");
await page.screenshot({ path: path.join(qaDir, "dashboard-brand-filter.png"), fullPage: true });

await page.getByRole("button", { name: "重置" }).click();
await page.getByRole("button", { name: "账号行动池" }).click();
await page.getByRole("heading", { name: "账号行动池", exact: true }).waitFor();
await selects.nth(1).selectOption({ label: "高消耗重点优化" });
await page.waitForTimeout(250);
assert((await page.locator(".kpi-card").nth(4).innerText()).includes("9 / 9"), "行动标签筛选未联动 KPI");
await page.screenshot({ path: path.join(qaDir, "dashboard-action-filter.png"), fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "重置" }).click();
await page.getByRole("button", { name: "经营总览" }).click();
await page.waitForTimeout(400);
const viewport = await page.evaluate(() => ({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
}));
assert(viewport.scrollWidth <= viewport.clientWidth + 1, `移动端页面横向溢出：${JSON.stringify(viewport)}`);
await page.screenshot({ path: path.join(qaDir, "dashboard-mobile.png"), fullPage: true });

const report = {
  tested_at_utc: new Date().toISOString(),
  fallback_reason: "Cloud browser blocked localhost with ERR_BLOCKED_BY_CLIENT; local Playwright used.",
  checks: {
    desktop_kpis: "pass",
    methods_panel: "pass",
    brand_filter: "pass",
    segment_filter: "pass",
    mobile_overflow: "pass",
  },
  console_issues: consoleIssues,
  mobile_viewport: viewport,
};
await writeFile(path.join(qaDir, "dashboard_qa.json"), JSON.stringify(report, null, 2));
await browser.close();
await new Promise((resolve) => server.close(resolve));

if (consoleIssues.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
