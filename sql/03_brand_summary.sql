-- MySQL 8.0 | 品牌加权汇总
USE manga_ad_analysis;

SELECT
  brand_name,
  COUNT(DISTINCT account_id) AS account_count,
  SUM(impressions) AS impressions,
  SUM(clicks) AS clicks,
  SUM(plays) AS plays,
  SUM(platform_spend) AS spend,
  SUM(mixed_revenue_24h) AS mixed_revenue_24h,
  SUM(platform_spend) / NULLIF(SUM(clicks), 0) AS weighted_cpc,
  SUM(platform_spend) * 1000 / NULLIF(SUM(impressions), 0) AS weighted_cpm,
  SUM(clicks) / NULLIF(SUM(impressions), 0) AS weighted_ctr,
  SUM(plays) / NULLIF(SUM(impressions), 0) AS weighted_play_rate,
  SUM(platform_spend) / NULLIF(SUM(plays), 0) AS weighted_play_cost,
  SUM(mixed_revenue_24h) / NULLIF(SUM(platform_spend), 0) AS weighted_mixed_roi,
  SUM(platform_spend) / SUM(SUM(platform_spend)) OVER () AS spend_share
FROM fact_account_month
GROUP BY brand_name
ORDER BY spend DESC;

-- 对账：品牌消耗求和必须等于总消耗 207057.28714。
