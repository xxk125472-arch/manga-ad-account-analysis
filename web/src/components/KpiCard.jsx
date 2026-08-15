export default function KpiCard({ icon: Icon, label, value, note, tone = "teal" }) {
  return (
    <article className="kpi-card">
      <div className={`kpi-icon kpi-icon--${tone}`}>
        <Icon size={19} strokeWidth={2} aria-hidden="true" />
      </div>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="kpi-value">{value}</p>
        <p className="kpi-note">{note}</p>
      </div>
    </article>
  );
}
