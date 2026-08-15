-- MySQL 8.0 | 消耗×24h混合ROI 五类行动分层
USE manga_ad_analysis;

WITH params AS (
  SELECT 50.0 AS spend_floor, 1.0 AS roi_line
), account_base AS (
  SELECT
    month_date,
    account_id,
    MAX(account_name) AS account_name,
    MAX(brand_name) AS brand_name,
    SUM(impressions) AS impressions,
    SUM(clicks) AS clicks,
    SUM(plays) AS plays,
    SUM(platform_spend) AS platform_spend,
    SUM(mixed_revenue_24h) AS mixed_revenue_24h,
    SUM(clicks) / NULLIF(SUM(impressions), 0) AS ctr_recalc,
    SUM(platform_spend) / NULLIF(SUM(clicks), 0) AS cpc_recalc,
    SUM(platform_spend) / NULLIF(SUM(plays), 0) AS play_cost_recalc,
    SUM(plays) / NULLIF(SUM(impressions), 0) AS play_rate_recalc,
    SUM(mixed_revenue_24h) / NULLIF(SUM(platform_spend), 0) AS mixed_roi_recalc
  FROM fact_account_month
  GROUP BY month_date, account_id
), eligible_ordered AS (
  SELECT
    account_base.*,
    ROW_NUMBER() OVER (ORDER BY platform_spend) AS spend_row,
    COUNT(*) OVER () AS eligible_n
  FROM account_base
  CROSS JOIN params
  WHERE platform_spend >= params.spend_floor
), percentile_components AS (
  SELECT
    eligible_n,
    MAX(CASE
      WHEN spend_row = FLOOR((eligible_n - 1) * 0.75) + 1
      THEN platform_spend END
    ) AS lower_spend,
    MAX(CASE
      WHEN spend_row = CEIL((eligible_n - 1) * 0.75) + 1
      THEN platform_spend END
    ) AS upper_spend,
    ((eligible_n - 1) * 0.75) - FLOOR((eligible_n - 1) * 0.75) AS fraction
  FROM eligible_ordered
  GROUP BY eligible_n
), threshold AS (
  SELECT
    lower_spend + (upper_spend - lower_spend) * fraction AS high_spend_threshold
  FROM percentile_components
), scored AS (
  SELECT
    account_base.*,
    params.spend_floor,
    params.roi_line,
    threshold.high_spend_threshold,
    account_base.platform_spend >= params.spend_floor AS is_eligible,
    account_base.platform_spend >= params.spend_floor
      AND account_base.platform_spend >= threshold.high_spend_threshold AS is_high_spend
  FROM account_base
  CROSS JOIN params
  CROSS JOIN threshold
)
SELECT
  scored.*,
  CASE
    WHEN NOT is_eligible THEN '数据不足/低量池'
    WHEN is_high_spend AND mixed_roi_recalc >= roi_line THEN '核心扩量候选'
    WHEN is_high_spend AND mixed_roi_recalc < roi_line THEN '高消耗重点优化'
    WHEN NOT is_high_spend AND mixed_roi_recalc >= roi_line THEN '小步扩量观察'
    WHEN NOT is_high_spend AND mixed_roi_recalc < roi_line THEN '低效清理候选'
    ELSE '数据不足/低量池'
  END AS action_segment
FROM scored
ORDER BY platform_spend DESC, account_id;

-- 预期 high_spend_threshold = 735.80492；有效账号 283；五类总数 551。
