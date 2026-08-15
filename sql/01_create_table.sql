-- MySQL 8.0 | 账号×月事实表
-- 先运行 scripts/run_pipeline.py 生成 UTF-8 CSV，再按 README 的 Workbench 步骤导入。

CREATE DATABASE IF NOT EXISTS manga_ad_analysis
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE manga_ad_analysis;

DROP TABLE IF EXISTS fact_account_month;

CREATE TABLE fact_account_month (
  month_date DATE NOT NULL,
  account_id VARCHAR(64) NOT NULL,
  account_name VARCHAR(128) NOT NULL,
  customer_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(128) NOT NULL,
  brand_name VARCHAR(64) NOT NULL,
  impressions BIGINT NOT NULL,
  clicks BIGINT NOT NULL,
  platform_spend DECIMAL(18, 6) NOT NULL,
  actual_spend DECIMAL(18, 6) NOT NULL,
  ctr DECIMAL(18, 10) NULL,
  cpm DECIMAL(18, 10) NULL,
  cpc DECIMAL(18, 10) NULL,
  in_app_total_payment DECIMAL(18, 6) NOT NULL,
  payment_24h DECIMAL(18, 6) NOT NULL,
  revenue_24h DECIMAL(18, 6) NOT NULL,
  roi_24h DECIMAL(18, 10) NULL,
  mixed_revenue_24h DECIMAL(18, 6) NOT NULL,
  mixed_roi_24h DECIMAL(18, 10) NULL,
  plays BIGINT NOT NULL,
  play_cost DECIMAL(18, 10) NULL COMMENT '源字段；审计发现实际为播放量/消耗，不用于最终成本指标',
  play_rate DECIMAL(18, 10) NULL,
  PRIMARY KEY (month_date, account_id),
  INDEX idx_brand_month (brand_name, month_date),
  CONSTRAINT chk_nonnegative_volume CHECK (
    impressions >= 0 AND clicks >= 0 AND plays >= 0
  ),
  CONSTRAINT chk_nonnegative_value CHECK (
    platform_spend >= 0 AND actual_spend >= 0
    AND mixed_revenue_24h >= 0 AND revenue_24h >= 0
  )
);

-- Workbench 可使用 Table Data Import Wizard 导入：
-- data/processed/manga_ad_account_2026_07.csv
-- 日期格式应识别为 YYYY-MM-DD，首行为字段名。
