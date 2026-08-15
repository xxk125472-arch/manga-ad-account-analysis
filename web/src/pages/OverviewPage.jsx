import { ArrowRight, CheckCircle2 } from "lucide-react";

import AccountTable from "../components/AccountTable";
import { BrandRoiChart, ParetoChart, SegmentBarChart } from "../components/Charts";
import {
  aggregateBrands,
  buildPareto,
  formatPercent,
  priorityAccounts,
  segmentSummary,
} from "../lib/data";

function CardHeading({ kicker, title, note }) {
  return (
    <div className="card-heading">
      <div>
        <p className="section-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      {note && <span className="card-note">{note}</span>}
    </div>
  );
}

export default function OverviewPage({ accounts }) {
  const pareto = buildPareto(accounts);
  const topCount = Math.max(1, Math.floor(accounts.length * 0.1));
  const topShare = pareto[topCount - 1]?.cumulativeSpendShare ?? 0;
  const segments = segmentSummary(accounts);
  const brands = aggregateBrands(accounts);
  const countFor = (label) =>
    segments.find((item) => item.action_segment === label)?.accountCount ?? 0;

  return (
    <div className="page-stack">
      <section className="overview-primary">
        <article className="panel pareto-panel">
          <CardHeading
            kicker="CONCENTRATION"
            title="预算集中度"
            note={`${accounts.length} 个筛选后账号`}
          />
          <div className="pareto-callout">
            <span>Top 10% 账号消耗贡献</span>
            <strong>{formatPercent(topShare, 1)}</strong>
          </div>
          <div className="chart-height chart-height--pareto">
            <ParetoChart data={pareto} />
          </div>
        </article>

        <aside className="insight-rail">
          <div className="rail-metric rail-metric--risk">
            <span>{countFor("高消耗重点优化")}</span>
            <div><strong>高消耗重点优化</strong><p>先核查高消耗、ROI 低于 1 的账号。</p></div>
          </div>
          <div className="rail-metric rail-metric--good">
            <span>{countFor("核心扩量候选")}</span>
            <div><strong>核心扩量候选</strong><p>以小幅预算和固定观察窗验证稳定性。</p></div>
          </div>
          <div className="rail-actions">
            <p className="section-kicker">NEXT ACTIONS</p>
            <h3>推荐下一步</h3>
            <ul>
              <li><CheckCircle2 size={16} />先审高消耗重点优化账号的计划配置</li>
              <li><CheckCircle2 size={16} />扩量候选设置预算上限与 2–3 天观察窗</li>
              <li><CheckCircle2 size={16} />低量池补足样本后再判断效率</li>
            </ul>
            <span className="evidence-link">行动标签是核查队列，不是自动预算指令 <ArrowRight size={14} /></span>
          </div>
        </aside>
      </section>

      <section className="two-column-charts">
        <article className="panel">
          <CardHeading kicker="BRAND BENCHMARK" title="品牌加权混合 ROI" note="虚线为 1.0 参考线" />
          <BrandRoiChart data={brands} />
        </article>
        <article className="panel">
          <CardHeading kicker="ACTION QUEUES" title="账号行动分层" note="账号数" />
          <SegmentBarChart data={segments} />
        </article>
      </section>

      <section className="panel">
        <CardHeading kicker="PRIORITY REVIEW" title="优先核查账号" note="先按行动优先级，再按消耗降序" />
        <AccountTable accounts={priorityAccounts(accounts, 8)} compact />
      </section>
    </div>
  );
}
