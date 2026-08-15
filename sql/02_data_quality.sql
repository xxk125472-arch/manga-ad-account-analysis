-- MySQL 8.0 | 数据质量检查
USE manga_ad_analysis;

-- 1. 规模、唯一性与空值
SELECT
  COUNT(*) AS row_count,
  COUNT(DISTINCT account_id) AS account_count,
  COUNT(DISTINCT brand_name) AS brand_count,
  MIN(month_date) AS min_month,
  MAX(month_date) AS max_month
FROM fact_account_month;

SELECT month_date, account_id, COUNT(*) AS duplicate_count
FROM fact_account_month
GROUP BY month_date, account_id
HAVING COUNT(*) > 1;

-- 2. 零分母与业务冲突；零值是解释性提示，不直接删除
SELECT
  SUM(impressions = 0) AS zero_impression_accounts,
  SUM(clicks = 0) AS zero_click_accounts,
  SUM(platform_spend = 0) AS zero_spend_accounts,
  SUM(plays = 0) AS zero_play_accounts,
  SUM(clicks > impressions) AS click_gt_impressions,
  SUM(plays > impressions) AS play_gt_impressions
FROM fact_account_month;

-- 3. 负值检查
SELECT COUNT(*) AS rows_with_negative_measure
FROM fact_account_month
WHERE impressions < 0 OR clicks < 0 OR plays < 0
   OR platform_spend < 0 OR actual_spend < 0
   OR in_app_total_payment < 0 OR payment_24h < 0
   OR revenue_24h < 0 OR mixed_revenue_24h < 0;

-- 4. 指标公式复核。源“播放成本”实际为播放量/消耗，必须另行重算。
SELECT
  SUM(
    plays > 0
    AND ABS(play_cost - platform_spend / NULLIF(plays, 0)) > 0.000001
  ) AS play_cost_formula_mismatch_accounts,
  SUM(
    platform_spend > 0
    AND ABS(play_cost - plays / NULLIF(platform_spend, 0)) <= 0.000001
  ) AS play_cost_matches_inverse_definition_accounts
FROM fact_account_month;

-- 预期：469 个有播放账号与“消耗/播放量”不一致；534 个有消耗账号匹配“播放量/消耗”。
