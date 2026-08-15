import { formatCurrency, formatPercent, formatRatio } from "../lib/data";

const TAG_CLASS = {
  高消耗重点优化: "segment-tag--focus",
  核心扩量候选: "segment-tag--core",
  低效清理候选: "segment-tag--risk",
  小步扩量观察: "segment-tag--watch",
  "数据不足/低量池": "segment-tag--low",
};

export default function AccountTable({ accounts, compact = false }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>账号</th>
            <th>品牌</th>
            <th className="number">消耗</th>
            <th className="number">混合 ROI</th>
            {!compact && <th className="number">CTR</th>}
            <th className="number">播放成本</th>
            <th>行动标签</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.account_id}>
              <td><strong>{account.account_name}</strong><small>{account.account_id}</small></td>
              <td>{account.brand_name}</td>
              <td className="number">{formatCurrency(account.platform_spend)}</td>
              <td className="number">{formatRatio(account.mixed_roi_recalc)}</td>
              {!compact && <td className="number">{formatPercent(account.ctr_recalc)}</td>}
              <td className="number">{formatCurrency(account.play_cost_recalc)}</td>
              <td><span className={`segment-tag ${TAG_CLASS[account.action_segment]}`}>{account.action_segment}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {accounts.length === 0 && <div className="empty-row">当前筛选下没有账号</div>}
    </div>
  );
}
