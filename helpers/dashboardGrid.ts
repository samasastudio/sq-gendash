import type {
  DashboardDataPoint,
  DashboardDatasetResult,
  DashboardWidget,
} from "@/lib/plan";
import { CHART_COLORS } from "@/constants/dashboard";
import { formatNumber } from "@/utilities/formatNumber";

export type ChartRow = {
  time: string;
  [key: string]: number | string;
};

export const toChartData = (rows: readonly DashboardDataPoint[]): readonly ChartRow[] =>
  rows.map((row) => ({ time: row.time, ...row.values }));

export const formatKpiValue = (
  widget: Extract<DashboardWidget, { type: "kpi" }>,
  dataset: DashboardDatasetResult,
) => {
  const latest = dataset.rows.at(-1);

  if (!latest) {
    return "—";
  }

  const value = latest.values[widget.field] ?? 0;

  if (widget.agg === "percentChange") {
    const base = dataset.rows[0]?.values[widget.field] ?? value;
    const change = base === 0 ? 0 : (value - base) / base;
    return formatNumber(change, "percent");
  }

  if (widget.agg === "average") {
    const total = dataset.rows.reduce(
      (sum, row) => sum + (row.values[widget.field] ?? 0),
      0,
    );
    const average = dataset.rows.length > 0 ? total / dataset.rows.length : 0;
    return formatNumber(average, widget.format);
  }

  if (widget.agg === "sum") {
    const total = dataset.rows.reduce(
      (sum, row) => sum + (row.values[widget.field] ?? 0),
      0,
    );
    return formatNumber(total, widget.format);
  }

  return formatNumber(value, widget.format);
};
