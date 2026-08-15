import { AlertTriangle, ShieldCheck, X } from "lucide-react";

export default function MethodPanel({ open, onClose, metadata, parameters }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="method-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="method-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="method-head">
          <div>
            <p className="section-kicker">METHODS &amp; SCOPE</p>
            <h2 id="method-title">方法、口径与边界</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <div className="method-block">
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <h3>数据范围</h3>
            <p>{metadata.privacy_note}</p>
            <p>{metadata.scope_note}</p>
          </div>
        </div>
        <div className="formula-grid">
          <div><span>加权 CTR</span><strong>总点击 ÷ 总展示</strong></div>
          <div><span>加权 CPC</span><strong>总消耗 ÷ 总点击</strong></div>
          <div><span>混合 ROI</span><strong>24h 混合变现 ÷ 总消耗</strong></div>
          <div><span>播放成本</span><strong>总消耗 ÷ 总播放</strong></div>
        </div>
        <div className="method-block method-block--warning">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <h3>源字段审计发现</h3>
            <p>
              源表“播放成本”实际等于播放量÷消耗，与手册定义相反。本看板保留源字段用于审计，展示和相关性分析统一使用重算值。
            </p>
          </div>
        </div>
        <div className="rule-line">
          样本门槛：消耗 ≥ {parameters.spend_floor} · 高消耗边界：有效账号消耗 P75 = {parameters.high_spend_threshold.toFixed(2)} · ROI 参考线：{parameters.roi_line.toFixed(1)}
        </div>
      </section>
    </div>
  );
}
