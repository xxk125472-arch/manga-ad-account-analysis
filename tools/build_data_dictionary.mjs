import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const artifactSpecifier = runtimeModules
  ? pathToFileURL(path.join(runtimeModules, "@oai/artifact-tool/dist/artifact_tool.mjs")).href
  : "@oai/artifact-tool";

let SpreadsheetFile;
let Workbook;
try {
  ({ SpreadsheetFile, Workbook } = await import(artifactSpecifier));
} catch (error) {
  throw new Error(
    "无法加载 @oai/artifact-tool。最终 data_dictionary.xlsx 已随仓库提供；" +
      "如需重建，请在含该组件的 ChatGPT Work/Codex 运行时执行本脚本。",
    { cause: error },
  );
}

const FONT_FAMILY = "Noto Sans CJK SC";
const fontFiles = [
  "/tmp/codex-fontpkg/node_modules/@fontpkg/noto-sans-cjk-sc/NotoSansCJKsc-Regular.otf",
  "/tmp/codex-fontpkg/node_modules/@fontpkg/noto-sans-cjk-sc/NotoSansCJKsc-Bold.otf",
];
if (runtimeModules && fontFiles.every(existsSync)) {
  const skiaPath = path.join(
    runtimeModules,
    "@oai/artifact-tool/node_modules/skia-canvas/lib/index.mjs",
  );
  const { FontLibrary } = await import(pathToFileURL(skiaPath).href);
  FontLibrary.use(FONT_FAMILY, fontFiles);
}

const projectRoot = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(import.meta.dirname, "..");
const outputPath = path.join(projectRoot, "docs", "data_dictionary.xlsx");
const qaDir = path.join(projectRoot, "qa", "data_dictionary");

const COLORS = {
  ink: "#17213A",
  muted: "#667085",
  teal: "#148A8B",
  tealLight: "#EAF7F5",
  blue: "#3867D6",
  blueGray: "#E8EEF5",
  panel: "#FFFDF9",
  line: "#D8DEE8",
  canvas: "#F7F5F0",
  warning: "#FFF3E8",
  risk: "#FDECE7",
  good: "#EAF7F0",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""])));
}

function setTitle(sheet, title, subtitle, endColumn) {
  sheet.mergeCells(`A1:${endColumn}1`);
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A1").format = {
    fill: COLORS.ink,
    font: { name: FONT_FAMILY, size: 18, bold: true, color: "#FFFFFF" },
    verticalAlignment: "center",
  };
  sheet.getRange("A1").format.rowHeight = 34;
  sheet.mergeCells(`A2:${endColumn}2`);
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange("A2").format = {
    fill: COLORS.canvas,
    font: { name: FONT_FAMILY, size: 9, color: COLORS.muted },
    wrapText: true,
    verticalAlignment: "center",
  };
  sheet.getRange("A2").format.rowHeight = 32;
  sheet.showGridLines = false;
}

function styleTable(sheet, rangeAddress, headerAddress) {
  sheet.getRange(rangeAddress).format = {
    font: { name: FONT_FAMILY, size: 9, color: COLORS.ink },
    verticalAlignment: "center",
    wrapText: true,
    borders: {
      insideHorizontal: { style: "thin", color: COLORS.line },
      bottom: { style: "thin", color: COLORS.line },
    },
  };
  sheet.getRange(headerAddress).format = {
    fill: COLORS.blueGray,
    font: { name: FONT_FAMILY, size: 9, bold: true, color: COLORS.ink },
    horizontalAlignment: "left",
    verticalAlignment: "center",
    wrapText: true,
    borders: {
      top: { style: "thin", color: COLORS.line },
      bottom: { style: "medium", color: COLORS.blue },
    },
  };
  sheet.getRange(headerAddress).format.rowHeight = 26;
}

function writeSheet(sheet, headers, rows) {
  const startRow = 4;
  const endColumn = String.fromCharCode(64 + headers.length);
  sheet.getRange(`A${startRow}:${endColumn}${startRow}`).values = [headers];
  if (rows.length) {
    sheet.getRange(`A${startRow + 1}:${endColumn}${startRow + rows.length}`).values = rows;
  }
  styleTable(
    sheet,
    `A${startRow}:${endColumn}${startRow + Math.max(rows.length, 1)}`,
    `A${startRow}:${endColumn}${startRow}`,
  );
  sheet.freezePanes.freezeRows(startRow);
  return { startRow, endRow: startRow + rows.length, endColumn };
}

const workbook = Workbook.create();
const receipt = JSON.parse(await fs.readFile(path.join(projectRoot, "outputs", "pipeline_receipt.json"), "utf8"));
const qualityRows = parseCsv(await fs.readFile(path.join(projectRoot, "data", "processed", "data_quality_summary.csv"), "utf8"));

const fields = [
  ["month_date", "日期", "日期", "账号×月主键的一部分", "YYYY-MM-DD", "保留"],
  ["account_id", "账号ID", "文本", "深度脱敏的账号标识", "匿名且唯一", "公开"],
  ["account_name", "账号名称", "文本", "深度脱敏的账号名称", "仅用于可读展示", "公开"],
  ["customer_id", "客户ID", "文本", "客户主体标识", "本数据仅1个主体，无比较价值", "网页移除"],
  ["customer_name", "客户名称", "文本", "客户主体名称", "本数据仅1个主体，无比较价值", "网页移除"],
  ["brand_name", "品牌", "文本", "深度脱敏的漫剧品牌", "实际8个品牌", "公开"],
  ["impressions", "展示量", "整数", "广告展示次数", "基础量；可为0", "公开"],
  ["clicks", "点击量", "整数", "广告点击次数", "基础量；可为0", "公开"],
  ["platform_spend", "三连投放总消耗", "数值", "平台投放消耗", "同比例缩放；分层主规模指标", "公开"],
  ["actual_spend", "实际消耗", "数值", "实际结算消耗", "仅用于审计", "派生CSV保留"],
  ["ctr", "点击率", "比率", "源表派生指标", "最终用 clicks/impressions 重算", "审计"],
  ["cpm", "千次展示成本", "数值", "源表派生指标", "最终用 spend×1000/impressions 重算", "审计"],
  ["cpc", "点击成本", "数值", "源表派生指标", "最终用 spend/clicks 重算", "审计"],
  ["in_app_total_payment", "应用内总付费", "数值", "应用内付费额", "同比例缩放", "派生CSV保留"],
  ["payment_24h", "24小时付费", "数值", "24小时付费额", "同比例缩放", "派生CSV保留"],
  ["revenue_24h", "24小时变现", "数值", "24小时变现金额", "同比例缩放", "派生CSV保留"],
  ["roi_24h", "24小时ROI", "比率", "源表24小时ROI", "最终从基础金额重算", "审计"],
  ["mixed_revenue_24h", "24小时混合变现", "数值", "24小时混合变现金额", "核心ROI分子；同比例缩放", "公开"],
  ["mixed_roi_24h", "24小时混合ROI", "比率", "源表派生指标", "最终用 mixed_revenue/spend 重算", "审计"],
  ["plays", "播放量", "整数", "视频播放次数", "基础量；可为0", "公开"],
  ["play_cost", "播放成本", "数值", "源字段名与公式冲突", "实测等于 plays/spend；不可当成本使用", "仅审计"],
  ["play_rate", "播放率", "比率", "源表派生指标", "最终用 plays/impressions 重算", "审计"],
];

const metrics = [
  ["加权 CTR", "总点击 ÷ 总展示", "SUM(clicks)/SUM(impressions)", "前链路点击效率", "分母为0时为空"],
  ["加权 CPC", "总消耗 ÷ 总点击", "SUM(spend)/SUM(clicks)", "点击成本", "分母为0时为空"],
  ["加权 CPM", "总消耗 × 1000 ÷ 总展示", "SUM(spend)*1000/SUM(impressions)", "千次展示成本", "分母为0时为空"],
  ["加权播放率", "总播放 ÷ 总展示", "SUM(plays)/SUM(impressions)", "内容承接效率", "分母为0时为空"],
  ["重算播放成本", "总消耗 ÷ 总播放", "SUM(spend)/SUM(plays)", "有效内容消费成本", "替代源字段 play_cost"],
  ["24h 混合 ROI", "24h 混合变现 ÷ 总消耗", "SUM(mixed_revenue_24h)/SUM(spend)", "核心回收效率", "ROI=1 不等于公司盈利"],
  ["有效样本", "账号消耗 ≥ 50", "platform_spend >= 50", "稳定分析护栏", "低于门槛仍保留"],
  ["高消耗边界", "有效账号消耗 P75", "PERCENTILE_CONT(0.75)", "区分重点账号", `本期 ${receipt.parameters.high_spend_threshold.toFixed(2)}`],
  ["累计消耗占比", "按账号消耗降序累计 ÷ 总消耗", "running_sum(spend)/SUM(spend)", "预算集中度", "Top10% 用 FLOOR(n×10%)"],
];

const sourceAssessment = [
  ["数据行数", 551, receipt.checks.row_count_is_551 ? 551 : null, null, "账号×月"],
  ["唯一账号", 551, receipt.checks.account_count_is_551 ? 551 : null, null, "一账号一行"],
  ["匿名品牌", 8, receipt.checks.brand_count_is_8 ? 8 : null, null, "全部为漫剧"],
  ["源字段", 22, 22, null, "不含派生字段"],
  ["分析月份", "2026-07", "2026-07", null, "完整自然月"],
];

const fieldSheet = workbook.worksheets.add("字段字典");
setTitle(fieldSheet, "字段字典", "源工作簿的 22 个规范字段。公开网页不包含客户字段，所有比率以基础量重算。", "F");
const fieldRange = writeSheet(fieldSheet, ["规范字段", "源字段", "类型", "业务含义", "处理/边界", "公开策略"], fields);
fieldSheet.getRange(`A5:A${fieldRange.endRow}`).format.font = { name: FONT_FAMILY, size: 9, bold: true, color: COLORS.blue };
fieldSheet.getRange("A:A").format.columnWidth = 22;
fieldSheet.getRange("B:B").format.columnWidth = 22;
fieldSheet.getRange("C:C").format.columnWidth = 11;
fieldSheet.getRange("D:D").format.columnWidth = 30;
fieldSheet.getRange("E:E").format.columnWidth = 38;
fieldSheet.getRange("F:F").format.columnWidth = 16;

const metricSheet = workbook.worksheets.add("指标口径");
setTitle(metricSheet, "指标口径", "品牌与组合层指标必须按基础量汇总后再相除，禁止直接平均账号比率。", "E");
const metricRange = writeSheet(metricSheet, ["指标", "业务公式", "实现公式", "用于回答", "解释边界"], metrics);
metricSheet.getRange(`A5:A${metricRange.endRow}`).format.font = { name: FONT_FAMILY, size: 9, bold: true, color: COLORS.teal };
metricSheet.getRange("A:A").format.columnWidth = 22;
metricSheet.getRange("B:B").format.columnWidth = 32;
metricSheet.getRange("C:C").format.columnWidth = 42;
metricSheet.getRange("D:D").format.columnWidth = 26;
metricSheet.getRange("E:E").format.columnWidth = 34;

const assessmentSheet = workbook.worksheets.add("数据源评估");
setTitle(assessmentSheet, "数据源评估", "核验实际值与项目契约；状态列由公式计算，便于复查源文件变化。", "E");
const assessmentRange = writeSheet(assessmentSheet, ["检查项", "预期值", "实际值", "状态", "解释"], sourceAssessment);
assessmentSheet.getRange("D5").formulas = [["=IF(B5=C5,\"通过\",\"复核\")"]];
assessmentSheet.getRange(`D5:D${assessmentRange.endRow}`).fillDown();
assessmentSheet.getRange(`D5:D${assessmentRange.endRow}`).conditionalFormats.add("containsText", { text: "通过", format: { fill: COLORS.good, font: { color: "#17613B", bold: true } } });
assessmentSheet.getRange(`D5:D${assessmentRange.endRow}`).conditionalFormats.add("containsText", { text: "复核", format: { fill: COLORS.risk, font: { color: "#A6422A", bold: true } } });
assessmentSheet.getRange("A:A").format.columnWidth = 24;
assessmentSheet.getRange("B:C").format.columnWidth = 16;
assessmentSheet.getRange("D:D").format.columnWidth = 14;
assessmentSheet.getRange("E:E").format.columnWidth = 38;

const qualitySheet = workbook.worksheets.add("质量检查");
setTitle(qualitySheet, "质量检查", "结构问题为阻断项；零分母为解释性提示。源“播放成本”公式冲突已单独披露。", "E");
const qualityMatrix = qualityRows.map((row) => [row.check_name, Number(row.value), row.status, row.severity, row.description]);
const qualityRange = writeSheet(qualitySheet, ["检查名", "值", "状态", "严重度", "说明"], qualityMatrix);
qualitySheet.getRange(`C5:C${qualityRange.endRow}`).conditionalFormats.add("containsText", { text: "通过", format: { fill: COLORS.good, font: { color: "#17613B", bold: true } } });
qualitySheet.getRange(`C5:C${qualityRange.endRow}`).conditionalFormats.add("containsText", { text: "注意", format: { fill: COLORS.warning, font: { color: "#8A4B08", bold: true } } });
qualitySheet.getRange(`C5:C${qualityRange.endRow}`).conditionalFormats.add("containsText", { text: "未通过", format: { fill: COLORS.risk, font: { color: "#A6422A", bold: true } } });
qualitySheet.getRange("A:A").format.columnWidth = 42;
qualitySheet.getRange("B:B").format.columnWidth = 12;
qualitySheet.getRange("C:D").format.columnWidth = 14;
qualitySheet.getRange("E:E").format.columnWidth = 70;
qualitySheet.getRange(`B5:B${qualityRange.endRow}`).format.numberFormat = "0";

const rules = [
  ["核心扩量候选", "消耗≥50；消耗≥有效账号P75；混合ROI≥1", "小幅增加预算上限，2-3天观察回收与稳定性", "候选，不等于自动扩量"],
  ["高消耗重点优化", "消耗≥50；消耗≥有效账号P75；混合ROI<1", "优先检查素材、计划配置和承接链路；必要时降预算", "9个账号承担较高风险"],
  ["小步扩量观察", "消耗≥50；消耗<P75；混合ROI≥1", "小步验证增量，设置止损与观察窗", "低规模高ROI可能受样本影响"],
  ["低效清理候选", "消耗≥50；消耗<P75；混合ROI<1", "复核后暂停低效计划或释放预算", "先排除短期波动和配置问题"],
  ["数据不足/低量池", "消耗<50", "补样本或保留测试，不参与稳定性对标", "不得直接判定好坏"],
];
const rulesSheet = workbook.worksheets.add("行动规则");
setTitle(rulesSheet, "行动规则", `当前参数：消耗门槛 50；有效账号高消耗 P75 = ${receipt.parameters.high_spend_threshold.toFixed(2)}；ROI 参考线 = 1.0。`, "D");
const rulesRange = writeSheet(rulesSheet, ["行动标签", "判定规则", "建议动作", "必须说明的边界"], rules);
rulesSheet.getRange(`A5:A${rulesRange.endRow}`).format.font = { name: FONT_FAMILY, size: 9, bold: true, color: COLORS.teal };
rulesSheet.getRange("A:A").format.columnWidth = 24;
rulesSheet.getRange("B:B").format.columnWidth = 50;
rulesSheet.getRange("C:C").format.columnWidth = 56;
rulesSheet.getRange("D:D").format.columnWidth = 40;

for (const sheet of workbook.worksheets.items) {
  const used = sheet.getUsedRange();
  if (used) used.format.autofitRows();
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.mkdir(qaDir, { recursive: true });

const inspect = await workbook.inspect({
  kind: "sheet,formula",
  maxChars: 7000,
  options: { maxResults: 100 },
});
await fs.writeFile(path.join(qaDir, "inspect.ndjson"), inspect.ndjson ?? String(inspect), "utf8");

const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
const formulaErrorText = formulaErrors.ndjson ?? String(formulaErrors);
await fs.writeFile(path.join(qaDir, "formula_errors.ndjson"), formulaErrorText, "utf8");
if (/\"type\"\s*:\s*\"match\"/.test(formulaErrorText)) {
  throw new Error("数据字典存在公式错误；请检查 qa/data_dictionary/formula_errors.ndjson");
}

for (const sheetName of ["字段字典", "指标口径", "数据源评估", "质量检查", "行动规则"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(qaDir, `${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, sheets: workbook.worksheets.items.map((sheet) => sheet.name) }, null, 2));
