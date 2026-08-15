-- MySQL 8.0 | 账号消耗 Pareto
USE manga_ad_analysis;

WITH account_spend AS (
  SELECT
    account_id,
    MAX(account_name) AS account_name,
    MAX(brand_name) AS brand_name,
    SUM(platform_spend) AS spend
  FROM fact_account_month
  GROUP BY account_id
), ranked AS (
  SELECT
    account_spend.*,
    ROW_NUMBER() OVER (ORDER BY spend DESC, account_id) AS spend_rank,
    COUNT(*) OVER () AS account_n,
    SUM(spend) OVER () AS total_spend,
    SUM(spend) OVER (
      ORDER BY spend DESC, account_id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_spend
  FROM account_spend
)
SELECT
  account_id,
  account_name,
  brand_name,
  spend,
  spend_rank,
  spend_rank / account_n AS cumulative_account_share,
  spend / NULLIF(total_spend, 0) AS spend_share,
  cumulative_spend / NULLIF(total_spend, 0) AS cumulative_spend_share
FROM ranked
ORDER BY spend_rank;

-- 口径：Top 10% 使用 FLOOR(551 * 0.10) = 55 个账号，累计消耗占比约 64.7%。
