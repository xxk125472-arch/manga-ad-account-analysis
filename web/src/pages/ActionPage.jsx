import { Info } from "lucide-react";

import AccountTable from "../components/AccountTable";
import { AccountScatterChart } from "../components/Charts";
import { priorityAccounts, segmentSummary } from "../lib/data";

const RULES = [
  ["样本门槛", "消耗 ≥ 50", "低于门槛统一进入数据不足/低量池"],
  ["高消耗边界", "P75 = 735.80", "仅在达到样本门槛的账号中计算"],
  ["效率参考线", "混合 ROI = 1.0", "仅表示本口径下变现覆盖投放消耗"],
  ["执行原则", "小步验证", "设预算上限、观察窗和回滚条件"],
];

export default function ActionPage({ accounts, parameters, correlations }) {
  const eligible = accounts.filter((account) => account.is_eligible);
  const segments = segmentSummary(accounts);
  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="section-kicker">ACCOUNT ACTION POOL</p>
          <h2>账号行动池</h2>
          <p>把账号分配到可审计的核查队列；最终预算动作仍需结合素材、计划配置和连续观察窗。</p>
        </div>
        <div className="scope-chip"><Info size={15} /> 当前显示 {accounts.length} 个账号</div>
      </section>

      <section className="rule-grid">
        {RULES.map(([label, value, note]) => <article key={label}><p>{label}</p><strong>{value}</strong><span>{note}</span></article>)}
      </section>

      <section className="action-layout">
        <article className="panel">
          <div className="card-heading"><div><p className="section-kicker">SPEND × RETURN</p><h2>有效账号定位图</h2></div><span className="card-note">横轴为对数刻度</span></div>
          <AccountScatterChart data={eligible} threshold={parameters.high_spend_threshold} />
          <p className="chart-footnote">横虚线为 ROI=1；竖虚线为有效账号消耗 P75。悬停可查看匿名账号与行动标签。</p>
        </article>
        <aside className="panel segment-summary-list">
          <div className="card-heading"><div><p className="section-kicker">QUEUE SUMMARY</p><h2>分层摘要</h2></div></div>
          {segments.map((segment) => <div className="segment-summary-row" key={segment.action_segment}><span className="legend-dot" style={{ background: segment.fill }} /><div><strong>{segment.action_segment}</strong><small>筛选后账号</small></div><b>{segment.accountCount}</b></div>)}
          <div className="correlation-note">
            <p className="section-kicker">NON-CAUSAL EVIDENCE</p>
            <h3>指标关联均较弱</h3>
            {correlations.map((item) => <div key={item.metric}><span>{item.metric}</span><strong>{item.spearman_rho >= 0 ? "+" : ""}{item.spearman_rho.toFixed(3)}</strong></div>)}
            <p>Spearman 相关性只用于提出待验证假设，不作为直接调预算依据。</p>
          </div>
        </aside>
      </section>

      <section className="panel">
        <div className="card-heading"><div><p className="section-kicker">ACTION TABLE</p><h2>账号核查清单</h2></div><span className="card-note">最多展示前 20 个优先账号</span></div>
        <AccountTable accounts={priorityAccounts(accounts, 20)} />
      </section>
    </div>
  );
}
