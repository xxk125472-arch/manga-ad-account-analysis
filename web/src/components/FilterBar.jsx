import { RotateCcw } from "lucide-react";

import { ALL } from "../lib/data";

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={ALL}>全部</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function FilterBar({ filters, options, onChange, onReset }) {
  return (
    <div className="filter-bar" aria-label="全局筛选器">
      <FilterSelect
        label="品牌"
        value={filters.brand}
        options={options.brands}
        onChange={(value) => onChange("brand", value)}
      />
      <FilterSelect
        label="行动标签"
        value={filters.segment}
        options={options.segments}
        onChange={(value) => onChange("segment", value)}
      />
      <FilterSelect
        label="样本状态"
        value={filters.sample}
        options={options.samples}
        onChange={(value) => onChange("sample", value)}
      />
      <button className="reset-button" type="button" onClick={onReset}>
        <RotateCcw size={15} aria-hidden="true" />
        重置
      </button>
    </div>
  );
}
