export const ALL = "全部";

export const SEGMENT_ORDER = [
  "高消耗重点优化",
  "核心扩量候选",
  "低效清理候选",
  "小步扩量观察",
  "数据不足/低量池",
];

export const SEGMENT_COLORS = {
  高消耗重点优化: "#F4A261",
  核心扩量候选: "#148A8B",
  低效清理候选: "#E96B4B",
  小步扩量观察: "#5F8FB7",
  "数据不足/低量池": "#AAB4C3",
};

const divide = (numerator, denominator) =>
  denominator > 0 ? numerator / denominator : null;

export function filterAccounts(accounts, filters) {
  return accounts.filter(
    (account) =>
      (filters.brand === ALL || account.brand_name === filters.brand) &&
      (filters.segment === ALL || account.action_segment === filters.segment) &&
      (filters.sample === ALL || account.sample_status === filters.sample),
  );
}

export function aggregateAccounts(accounts) {
  const totals = accounts.reduce(
    (sum, account) => ({
      accountCount: sum.accountCount + 1,
      eligibleAccountCount:
        sum.eligibleAccountCount + (account.is_eligible ? 1 : 0),
      impressions: sum.impressions + account.impressions,
      clicks: sum.clicks + account.clicks,
      plays: sum.plays + account.plays,
      spend: sum.spend + account.platform_spend,
      mixedRevenue: sum.mixedRevenue + account.mixed_revenue_24h,
    }),
    {
      accountCount: 0,
      eligibleAccountCount: 0,
      impressions: 0,
      clicks: 0,
      plays: 0,
      spend: 0,
      mixedRevenue: 0,
    },
  );

  return {
    ...totals,
    weightedMixedRoi: divide(totals.mixedRevenue, totals.spend),
    weightedCtr: divide(totals.clicks, totals.impressions),
    weightedCpc: divide(totals.spend, totals.clicks),
    weightedCpm: divide(totals.spend * 1000, totals.impressions),
    weightedPlayRate: divide(totals.plays, totals.impressions),
    weightedPlayCost: divide(totals.spend, totals.plays),
  };
}

export function aggregateBrands(accounts) {
  const groups = new Map();
  accounts.forEach((account) => {
    if (!groups.has(account.brand_name)) {
      groups.set(account.brand_name, []);
    }
    groups.get(account.brand_name).push(account);
  });

  return Array.from(groups, ([brand_name, rows]) => ({
    brand_name,
    ...aggregateAccounts(rows),
  })).sort((a, b) => b.spend - a.spend);
}

export function segmentSummary(accounts) {
  return SEGMENT_ORDER.map((action_segment) => {
    const rows = accounts.filter(
      (account) => account.action_segment === action_segment,
    );
    return {
      action_segment,
      ...aggregateAccounts(rows),
      fill: SEGMENT_COLORS[action_segment],
    };
  }).filter((item) => item.accountCount > 0);
}

export function buildPareto(accounts) {
  const sorted = [...accounts].sort(
    (a, b) => b.platform_spend - a.platform_spend,
  );
  const totalSpend = sorted.reduce(
    (sum, account) => sum + account.platform_spend,
    0,
  );
  let cumulativeSpend = 0;
  return sorted.map((account, index) => {
    cumulativeSpend += account.platform_spend;
    return {
      ...account,
      accountShare: (index + 1) / sorted.length,
      cumulativeSpendShare:
        totalSpend > 0 ? cumulativeSpend / totalSpend : 0,
    };
  });
}

export function priorityAccounts(accounts, limit = 12) {
  const priority = new Map(SEGMENT_ORDER.map((segment, index) => [segment, index]));
  return [...accounts]
    .sort(
      (a, b) =>
        priority.get(a.action_segment) - priority.get(b.action_segment) ||
        b.platform_spend - a.platform_spend,
    )
    .slice(0, limit);
}

export function formatCurrency(value, compact = false) {
  if (value == null || Number.isNaN(value)) return "—";
  if (compact && Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(2)}万`;
  }
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatRatio(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}x`;
}
