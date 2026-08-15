import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CircleDollarSign,
  Code2,
  Gauge,
  MousePointerClick,
  Play,
  ShieldCheck,
  Users,
} from "lucide-react";

import FilterBar from "./components/FilterBar";
import KpiCard from "./components/KpiCard";
import MethodPanel from "./components/MethodPanel";
import { ALL, aggregateAccounts, filterAccounts, formatCurrency, formatPercent, formatRatio } from "./lib/data";
const ActionPage = lazy(() => import("./pages/ActionPage"));
const BrandPage = lazy(() => import("./pages/BrandPage"));
const OverviewPage = lazy(() => import("./pages/OverviewPage"));

const TABS = [
  ["overview", "经营总览"],
  ["brands", "品牌对标"],
  ["actions", "账号行动池"],
];
const EMPTY_FILTERS = { brand: ALL, segment: ALL, sample: ALL };

function LoadingState() {
  return <main className="state-screen"><div className="loader" /><h1>正在载入分析数据</h1><p>读取本地预计算 JSON，不会连接外部业务系统。</p></main>;
}

function ErrorState({ message }) {
  return <main className="state-screen state-screen--error"><h1>数据载入失败</h1><p>{message}</p><code>python scripts/run_pipeline.py</code></main>;
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [methodOpen, setMethodOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("./data/dashboard.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(setData)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      });
    return () => controller.abort();
  }, []);

  const options = useMemo(() => {
    if (!data) return { brands: [], segments: [], samples: [] };
    const unique = (field) => [...new Set(data.accounts.map((item) => item[field]))].sort();
    return { brands: unique("brand_name"), segments: unique("action_segment"), samples: unique("sample_status") };
  }, [data]);
  const accounts = useMemo(() => data ? filterAccounts(data.accounts, filters) : [], [data, filters]);
  const kpis = useMemo(() => aggregateAccounts(accounts), [accounts]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-lockup"><div className="brand-mark">MANGA<span>OPS</span></div><div><div className="title-row"><h1>漫剧投放账号效能诊断</h1><span className="privacy-badge"><ShieldCheck size={13} />深度脱敏数据</span></div><p>2026 年 7 月 · 551 个匿名账号 · 单月横截面</p></div></div>
        <div className="header-actions">
          <button className="secondary-button" type="button" onClick={() => setMethodOpen(true)}><BookOpen size={16} />方法与口径</button>
          <button className="icon-button" type="button" onClick={() => setMethodOpen(true)} aria-label="查看项目技术说明"><Code2 size={18} /></button>
        </div>
      </header>

      <div className="control-row">
        <nav className="tabs" aria-label="分析页面">
          {TABS.map(([id, label]) => <button key={id} type="button" className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}>{label}</button>)}
        </nav>
        <FilterBar filters={filters} options={options} onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))} onReset={() => setFilters(EMPTY_FILTERS)} />
      </div>

      <main>
        <section className="kpi-grid" aria-label="核心指标">
          <KpiCard icon={CircleDollarSign} label="总消耗" value={formatCurrency(kpis.spend, true)} note="深度脱敏规模值" />
          <KpiCard icon={Gauge} label="24h 混合 ROI" value={formatRatio(kpis.weightedMixedRoi)} note="变现 ÷ 消耗；非利润率" tone={kpis.weightedMixedRoi >= 1 ? "teal" : "coral"} />
          <KpiCard icon={MousePointerClick} label="加权 CTR" value={formatPercent(kpis.weightedCtr)} note="总点击 ÷ 总展示" />
          <KpiCard icon={Play} label="加权播放率" value={formatPercent(kpis.weightedPlayRate)} note="总播放 ÷ 总展示" />
          <KpiCard icon={Users} label="有效账号" value={`${kpis.eligibleAccountCount} / ${kpis.accountCount}`} note="消耗达到 50 的账号" />
        </section>

        {accounts.length === 0 ? <section className="panel empty-filter-state"><h2>当前筛选没有匹配账号</h2><p>请重置筛选或选择更宽的范围。</p><button className="secondary-button" type="button" onClick={() => setFilters(EMPTY_FILTERS)}>重置筛选</button></section> : null}
        <Suspense fallback={<section className="panel page-loading">正在载入图表组件…</section>}>
          {accounts.length > 0 && activeTab === "overview" && <OverviewPage accounts={accounts} />}
          {accounts.length > 0 && activeTab === "brands" && <BrandPage accounts={accounts} />}
          {accounts.length > 0 && activeTab === "actions" && <ActionPage accounts={accounts} parameters={data.parameters} correlations={data.correlations} />}
        </Suspense>
      </main>

      <footer><span>相关性仅用于生成待验证假设；数据不足以支持因果结论。</span><span>口径：加权指标按基础量汇总后重算 · ROI=1 不等于公司盈利</span></footer>
      <MethodPanel open={methodOpen} onClose={() => setMethodOpen(false)} metadata={data.metadata} parameters={data.parameters} />
    </div>
  );
}
