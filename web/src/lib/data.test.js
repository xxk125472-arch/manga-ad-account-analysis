import { describe, expect, it } from "vitest";

import {
  aggregateAccounts,
  aggregateBrands,
  buildPareto,
  filterAccounts,
} from "./data";

const accounts = [
  {
    account_id: "A1",
    brand_name: "品牌A",
    action_segment: "核心扩量候选",
    sample_status: "达到样本门槛",
    impressions: 100,
    clicks: 10,
    plays: 20,
    platform_spend: 80,
    mixed_revenue_24h: 100,
  },
  {
    account_id: "A2",
    brand_name: "品牌A",
    action_segment: "低效清理候选",
    sample_status: "达到样本门槛",
    impressions: 300,
    clicks: 15,
    plays: 30,
    platform_spend: 120,
    mixed_revenue_24h: 60,
  },
  {
    account_id: "B1",
    brand_name: "品牌B",
    action_segment: "数据不足/低量池",
    sample_status: "低于样本门槛",
    impressions: 0,
    clicks: 0,
    plays: 0,
    platform_spend: 0,
    mixed_revenue_24h: 0,
  },
];

describe("dashboard data utilities", () => {
  it("applies all active filters together", () => {
    expect(
      filterAccounts(accounts, {
        brand: "品牌A",
        segment: "低效清理候选",
        sample: "达到样本门槛",
      }).map((item) => item.account_id),
    ).toEqual(["A2"]);
  });

  it("recomputes weighted metrics from additive fields", () => {
    const result = aggregateAccounts(accounts);

    expect(result.accountCount).toBe(3);
    expect(result.spend).toBe(200);
    expect(result.weightedMixedRoi).toBe(0.8);
    expect(result.weightedCtr).toBeCloseTo(25 / 400);
    expect(result.weightedPlayRate).toBeCloseTo(50 / 400);
  });

  it("aggregates filtered accounts to weighted brand rows", () => {
    const result = aggregateBrands(accounts);

    expect(result).toHaveLength(2);
    expect(result[0].brand_name).toBe("品牌A");
    expect(result[0].weightedMixedRoi).toBe(0.8);
    expect(result[0].accountCount).toBe(2);
  });

  it("builds a monotonic Pareto curve ending at one", () => {
    const result = buildPareto(accounts);

    expect(result[0].account_id).toBe("A2");
    expect(result[0].cumulativeSpendShare).toBe(0.6);
    expect(result.at(-1).cumulativeSpendShare).toBe(1);
  });
});
