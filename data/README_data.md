# 数据说明

本仓库只包含用于公开作品集的深度脱敏数据。品牌与账号均已匿名替换，金额与数量按一致规则处理；绝对值仅用于本数据集内部的相对比较，不能反推真实业务规模。

## 文件

| 文件 | 粒度 | 用途 |
|---|---|---|
| `processed/manga_ad_account_2026_07_anonymized.xlsx` | 账号 × 月 | 唯一源工作簿，工作表为“脱敏数据” |
| `processed/manga_ad_account_2026_07.csv` | 账号 × 月 | MySQL 导入文件，保留 22 个规范源字段 |
| `processed/data_quality_summary.csv` | 质量检查项 | 缺失、重复、零分母、跨字段规则与公式审计 |
| `processed/brand_summary.csv` | 品牌 | 使用基础量重算的加权指标 |
| `processed/account_pareto.csv` | 账号 | 消耗排名与累计消耗占比 |
| `processed/account_segments.csv` | 账号 | 重算指标、样本标记和五类行动标签 |
| `processed/correlation_matrix.csv` | 指标 × 指标 | 有效账号的 Spearman 相关系数 |

## 数据边界

- 时间范围：2026 年 7 月完整自然月。
- 样本：551 个匿名账号、8 个匿名漫剧品牌、22 个源字段。
- 不含日期明细、素材 ID、计划 ID、用户/付费批次、平台利润及制作成本。
- 因此不能做日/周趋势、素材归因、留存/LTV、利润测算或因果结论。
- 网页 JSON 不含 `customer_id`、`customer_name` 等客户字段。

## 关键口径

- 品牌 CTR = `SUM(clicks) / SUM(impressions)`。
- 品牌 CPC = `SUM(platform_spend) / SUM(clicks)`。
- 品牌播放成本 = `SUM(platform_spend) / SUM(plays)`。
- 品牌 24h 混合 ROI = `SUM(mixed_revenue_24h) / SUM(platform_spend)`。
- 源“播放成本”字段实际等于“播放量 ÷ 消耗”，本项目保留它用于审计，但不把它当成本使用。
- 分母为 0 时返回空值并保留账号，不用 0 或无穷大伪装有效比率。

任何对外展示都必须保留“深度脱敏、同比例缩放、单月横截面、非因果”的说明。
