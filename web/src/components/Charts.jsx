import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatPercent, formatRatio } from "../lib/data";

const AXIS = "#6B7488";
const GRID = "#E3E7ED";
const INK = "#17213A";

function TooltipCard({ active, payload, label, kind }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  if (kind === "pareto") {
    return (
      <div className="chart-tooltip">
        <strong>累计账号 {formatPercent(row.accountShare, 1)}</strong>
        <span>累计消耗 {formatPercent(row.cumulativeSpendShare, 1)}</span>
      </div>
    );
  }
  if (kind === "brand") {
    return (
      <div className="chart-tooltip">
        <strong>{row.brand_name}</strong>
        <span>消耗 {formatCurrency(row.spend)}</span>
        <span>混合 ROI {formatRatio(row.weightedMixedRoi)}</span>
        <span>账号 {row.accountCount}</span>
      </div>
    );
  }
  if (kind === "account") {
    return (
      <div className="chart-tooltip">
        <strong>{row.account_name}</strong>
        <span>{row.brand_name}</span>
        <span>消耗 {formatCurrency(row.platform_spend)}</span>
        <span>混合 ROI {formatRatio(row.mixed_roi_recalc)}</span>
        <span>{row.action_segment}</span>
      </div>
    );
  }
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>{payload[0].value}</span>
    </div>
  );
}

export function ParetoChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 2, left: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
        <XAxis
          dataKey="accountShare"
          type="number"
          domain={[0, 1]}
          tickFormatter={(value) => `${Math.round(value * 100)}%`}
          stroke={AXIS}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis
          domain={[0, 1]}
          tickFormatter={(value) => `${Math.round(value * 100)}%`}
          stroke={AXIS}
          tickLine={false}
          axisLine={false}
          width={42}
          fontSize={11}
        />
        <Tooltip content={<TooltipCard kind="pareto" />} />
        <ReferenceLine x={0.1} stroke="#148A8B" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="cumulativeSpendShare"
          stroke="#3867D6"
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
          activeDot={{ r: 4, fill: "#E96B4B", stroke: "white", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BrandRoiChart({ data, height = 270 }) {
  const sortedData = [...data].sort(
    (a, b) => b.weightedMixedRoi - a.weightedMixedRoi,
  );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ top: 4, right: 38, bottom: 0, left: 10 }}
      >
        <CartesianGrid stroke={GRID} strokeDasharray="3 4" horizontal={false} />
        <XAxis type="number" domain={[0, "auto"]} stroke={AXIS} tickLine={false} axisLine={false} fontSize={11} />
        <YAxis type="category" dataKey="brand_name" width={76} stroke={AXIS} tickLine={false} axisLine={false} fontSize={11} />
        <Tooltip content={<TooltipCard kind="brand" />} />
        <ReferenceLine x={1} stroke={INK} strokeDasharray="4 4" />
        <Bar dataKey="weightedMixedRoi" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
          {sortedData.map((entry) => (
            <Cell key={entry.brand_name} fill={entry.weightedMixedRoi >= 1 ? "#148A8B" : "#E96B4B"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SegmentBarChart({ data, height = 270 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 0, left: 22 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 4" horizontal={false} />
        <XAxis type="number" stroke={AXIS} tickLine={false} axisLine={false} fontSize={11} />
        <YAxis type="category" dataKey="action_segment" width={112} stroke={AXIS} tickLine={false} axisLine={false} fontSize={11} />
        <Tooltip content={<TooltipCard />} />
        <Bar dataKey="accountCount" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
          {data.map((entry) => <Cell key={entry.action_segment} fill={entry.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BrandScatterChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={330}>
      <ScatterChart margin={{ top: 14, right: 20, bottom: 8, left: 6 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 4" />
        <XAxis
          type="number"
          dataKey="spend"
          name="消耗"
          tickFormatter={(value) => value >= 10000 ? `${(value / 10000).toFixed(0)}万` : value}
          stroke={AXIS}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis type="number" dataKey="weightedMixedRoi" name="ROI" domain={[0.75, 1.1]} stroke={AXIS} tickLine={false} axisLine={false} width={45} fontSize={11} />
        <ReferenceLine y={1} stroke={INK} strokeDasharray="4 4" />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<TooltipCard kind="brand" />} />
        <Scatter data={data} fill="#3867D6" isAnimationActive={false}>
          {data.map((entry) => <Cell key={entry.brand_name} fill={entry.weightedMixedRoi >= 1 ? "#148A8B" : "#E96B4B"} />)}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function AccountScatterChart({ data, threshold }) {
  return (
    <ResponsiveContainer width="100%" height={370}>
      <ScatterChart margin={{ top: 12, right: 22, bottom: 12, left: 8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 4" />
        <XAxis
          type="number"
          dataKey="platform_spend"
          name="消耗"
          scale="log"
          domain={[50, "auto"]}
          tickFormatter={(value) => value >= 10000 ? `${(value / 10000).toFixed(0)}万` : Math.round(value)}
          stroke={AXIS}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis type="number" dataKey="mixed_roi_recalc" name="ROI" domain={[0.5, "auto"]} stroke={AXIS} tickLine={false} axisLine={false} width={45} fontSize={11} />
        <ReferenceLine x={threshold} stroke="#5F8FB7" strokeDasharray="4 4" />
        <ReferenceLine y={1} stroke={INK} strokeDasharray="4 4" />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<TooltipCard kind="account" />} />
        <Scatter data={data} isAnimationActive={false}>
          {data.map((entry) => <Cell key={entry.account_id} fill={entry.action_segment === "核心扩量候选" ? "#148A8B" : entry.action_segment === "高消耗重点优化" ? "#F4A261" : entry.action_segment === "低效清理候选" ? "#E96B4B" : "#5F8FB7"} fillOpacity={0.75} />)}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
