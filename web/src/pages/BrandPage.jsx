import { BrandRoiChart, BrandScatterChart } from "../components/Charts";
import {
  aggregateBrands,
  formatCurrency,
  formatPercent,
  formatRatio,
} from "../lib/data";

export default function BrandPage({ accounts }) {
  const brands = aggregateBrands(accounts);
  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="section-kicker">BRAND BENCHMARK</p>
          <h2>品牌规模与效率对标</h2>
          <p>横向比较使用加权口径；品牌比率由基础量汇总后重算，不对账号比率做简单平均。</p>
        </div>
        <div className="inline-evidence">
          <strong>{brands.filter((item) => item.weightedMixedRoi >= 1).length}</strong>
          <span>个品牌达到 ROI 参考线</span>
        </div>
      </section>

      <section className="two-column-charts two-column-charts--brand">
        <article className="panel">
          <div className="card-heading"><div><p className="section-kicker">EFFICIENCY</p><h2>加权混合 ROI</h2></div><span className="card-note">参考线 = 1.0</span></div>
          <BrandRoiChart data={brands} height={330} />
        </article>
        <article className="panel">
          <div className="card-heading"><div><p className="section-kicker">SCALE × RETURN</p><h2>消耗规模 × 回收效率</h2></div><span className="card-note">每点一个匿名品牌</span></div>
          <BrandScatterChart data={brands} />
        </article>
      </section>

      <section className="panel">
        <div className="card-heading"><div><p className="section-kicker">AUDIT TABLE</p><h2>品牌对账矩阵</h2></div><span className="card-note">按消耗降序</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>品牌</th><th className="number">账号数</th><th className="number">消耗</th><th className="number">消耗占比</th><th className="number">CTR</th><th className="number">CPC</th><th className="number">播放率</th><th className="number">播放成本</th><th className="number">混合 ROI</th></tr></thead>
            <tbody>
              {brands.map((brand) => {
                const totalSpend = brands.reduce((sum, item) => sum + item.spend, 0);
                return <tr key={brand.brand_name}><td><strong>{brand.brand_name}</strong></td><td className="number">{brand.accountCount}</td><td className="number">{formatCurrency(brand.spend)}</td><td className="number">{formatPercent(brand.spend / totalSpend)}</td><td className="number">{formatPercent(brand.weightedCtr)}</td><td className="number">{formatCurrency(brand.weightedCpc)}</td><td className="number">{formatPercent(brand.weightedPlayRate)}</td><td className="number">{formatCurrency(brand.weightedPlayCost)}</td><td className={`number ${brand.weightedMixedRoi >= 1 ? "metric-good" : "metric-risk"}`}>{formatRatio(brand.weightedMixedRoi)}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
