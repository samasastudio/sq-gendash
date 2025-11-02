"use client";

import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  DashboardPlan,
  DashboardWidget,
} from "@/app/(lib)/plan-schema";
import type {
  DatasetRow,
  DatasetState,
} from "@/app/(lib)/dashboard-data";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

const CHART_COLORS = [
  "#38bdf8",
  "#f97316",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
  "#22d3ee",
  "#c084fc",
];

const ROW_HEIGHT = 80;

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

function formatNumber(value: unknown) {
  if (typeof value === "number") return numberFormatter.format(value);
  if (typeof value === "string") {
    const num = Number(value);
    if (Number.isFinite(num)) return numberFormatter.format(num);
  }
  return String(value ?? "");
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateLong(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getNumeric(row: DatasetRow | undefined, field: string): number | null {
  if (!row) return null;
  const value = row[field];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function computeKpi(
  widget: Extract<DashboardWidget, { type: "kpi" }>,
  rows: DatasetRow[]
) {
  const latest = rows.at(-1);
  const latestValue = getNumeric(latest, widget.field);
  const first = rows[0];
  const baselineValue = widget.compareToField
    ? getNumeric(latest, widget.compareToField)
    : getNumeric(first, widget.field);
  let changePercent: number | null = null;
  if (
    widget.agg === "changePercent" &&
    latestValue != null &&
    baselineValue != null &&
    baselineValue !== 0
  ) {
    changePercent = ((latestValue - baselineValue) / baselineValue) * 100;
  }

  const formattedValue = formatKpiValue(widget.format, latestValue);
  const formattedChange =
    changePercent != null
      ? new Intl.NumberFormat(undefined, {
          style: "percent",
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }).format(changePercent / 100)
      : null;

  return {
    value: formattedValue,
    changePercent,
    changeLabel: formattedChange,
    lastUpdated: latest?.time ?? null,
  };
}

function formatKpiValue(
  format: "number" | "currency" | "percent",
  value: number | null
) {
  if (value == null) return "—";
  switch (format) {
    case "currency":
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(value);
    case "percent":
      return new Intl.NumberFormat(undefined, {
        style: "percent",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(value / 100);
    default:
      return numberFormatter.format(value);
  }
}

function computeLayout(plan: DashboardPlan) {
  const layout = plan.layout ?? [];
  if (layout.length === 0) {
    return plan.widgets.map((_, index) => ({
      widgetIndex: index,
      w: 12,
      h: 4,
      x: 0,
      y: index * 4,
    }));
  }

  const usedWidgetIndices = layout.map((item) => item.widgetIndex);
  const offsetBase = layout.reduce(
    (max, item) => Math.max(max, item.y + item.h),
    0
  );
  const missingItems = plan.widgets
    .map((_, index) => index)
    .filter((index) => !usedWidgetIndices.includes(index))
    .map((widgetIndex, position) => ({
      widgetIndex,
      w: 12,
      h: 4,
      x: 0,
      y: offsetBase + position * 4,
    }));

  return [...layout, ...missingItems].toSorted((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.widgetIndex - b.widgetIndex;
  });
}

type DatasetMap = Record<string, DatasetState>;

type WidgetProps = {
  widget: DashboardWidget;
  datasetState: DatasetState | undefined;
};

function WidgetContainer({ widget, datasetState }: WidgetProps) {
  const isChart = widget.type === "line" || widget.type === "area" || widget.type === "bar";
  const datasetId = widget.datasetId;
  const headerDescription =
    widget.type === "table"
      ? `${widget.columns.length} columns`
      : isChart
        ? `${widget.y.length} series`
        : widget.type === "kpi"
          ? widget.agg === "changePercent"
            ? "% change"
            : "Latest value"
          : undefined;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-inner shadow-black/40">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white">{widget.title}</h3>
          <p className="text-xs text-slate-400">Dataset · {datasetId}</p>
          {headerDescription ? (
            <p className="text-xs text-slate-500">{headerDescription}</p>
          ) : null}
        </div>
        {datasetState?.status === "success" ? (
          <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs font-semibold text-slate-300">
            {datasetState.cached ? "Cached" : "Live"}
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex-1">
        {renderWidgetContent(widget, datasetState)}
      </div>
      {datasetState?.status === "error" && datasetState.note ? (
        <p className="mt-3 text-xs text-rose-200/90">{datasetState.note}</p>
      ) : null}
      {datasetState?.status === "success" && datasetState.note ? (
        <p className="mt-3 text-xs text-emerald-200/80">{datasetState.note}</p>
      ) : null}
    </div>
  );
}

function renderWidgetContent(
  widget: DashboardWidget,
  datasetState: DatasetState | undefined
) {
  if (!datasetState) {
    return (
      <Placeholder>
        Dataset <span className="font-semibold">{widget.datasetId}</span> unavailable
      </Placeholder>
    );
  }
  if (datasetState.status === "loading") {
    return <Placeholder>Loading dataset…</Placeholder>;
  }
  if (datasetState.status === "error") {
    return (
      <div className="flex h-full flex-col justify-center gap-2 rounded-md border border-rose-600/40 bg-rose-950/30 p-4 text-sm text-rose-100">
        <p className="font-semibold">{datasetState.error}</p>
        {datasetState.detail ? <p className="text-xs">{datasetState.detail}</p> : null}
      </div>
    );
  }
  if (!datasetState.rows.length) {
    return <Placeholder>No rows returned for dataset.</Placeholder>;
  }

  switch (widget.type) {
    case "line":
    case "area":
    case "bar":
      return <ChartWidget widget={widget} rows={datasetState.rows} />;
    case "kpi":
      return <KpiWidget widget={widget} rows={datasetState.rows} />;
    case "table":
      return <TableWidget widget={widget} rows={datasetState.rows} />;
    default:
      return <Placeholder>Unsupported widget type.</Placeholder>;
  }
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-700/70 bg-slate-900/40 p-4 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

type ChartWidgetProps = {
  widget: Extract<DashboardWidget, { type: "line" | "area" | "bar" }>;
  rows: DatasetRow[];
};

function ChartWidget({ widget, rows }: ChartWidgetProps) {
  const xKey = widget.x ?? "time";
  const chartData = rows;
  if (widget.type === "bar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tickFormatter={formatDateLabel} stroke="#94a3b8" />
          <YAxis tickFormatter={formatNumber} stroke="#94a3b8" width={80} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              borderRadius: 12,
            }}
            labelFormatter={(value) => formatDateLong(String(value)) ?? String(value)}
            formatter={(value, name) => [formatNumber(value), name]}
          />
          <Legend />
          {widget.y.map((field, index) => (
            <Bar
              key={field}
              dataKey={field}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (widget.type === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
          <defs>
            {widget.y.map((field, index) => {
              const color = CHART_COLORS[index % CHART_COLORS.length];
              const gradientId = `gradient-${index}`;
              return (
                <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tickFormatter={formatDateLabel} stroke="#94a3b8" />
          <YAxis tickFormatter={formatNumber} stroke="#94a3b8" width={80} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              borderRadius: 12,
            }}
            labelFormatter={(value) => formatDateLong(String(value)) ?? String(value)}
            formatter={(value, name) => [formatNumber(value), name]}
          />
          <Legend />
          {widget.y.map((field, index) => {
            const color = CHART_COLORS[index % CHART_COLORS.length];
            const gradientId = `gradient-${index}`;
            return (
              <Area
                key={field}
                dataKey={field}
                type="monotone"
                stroke={color}
                fill={`url(#${gradientId})`}
                fillOpacity={1}
                strokeWidth={2}
                activeDot={{ r: 3 }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tickFormatter={formatDateLabel} stroke="#94a3b8" />
        <YAxis tickFormatter={formatNumber} stroke="#94a3b8" width={80} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: 12,
          }}
          labelFormatter={(value) => formatDateLong(String(value)) ?? String(value)}
          formatter={(value, name) => [formatNumber(value), name]}
        />
        <Legend />
        {widget.y.map((field, index) => (
          <Line
            key={field}
            type="monotone"
            dataKey={field}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

type KpiWidgetProps = {
  widget: Extract<DashboardWidget, { type: "kpi" }>;
  rows: DatasetRow[];
};

function KpiWidget({ widget, rows }: KpiWidgetProps) {
  const { value, changePercent, changeLabel, lastUpdated } = useMemo(
    () => computeKpi(widget, rows),
    [widget, rows]
  );
  const trendPositive = (changePercent ?? 0) >= 0;
  return (
    <div className="flex h-full flex-col justify-center gap-4 rounded-xl bg-slate-900/60 p-6">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-slate-400">{widget.title}</p>
        <p className="text-4xl font-bold text-white">{value}</p>
      </div>
      {changeLabel ? (
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${trendPositive ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-100"}`}
        >
          <span>{trendPositive ? "▲" : "▼"}</span>
          <span>{changeLabel}</span>
        </div>
      ) : null}
      <p className="text-xs text-slate-400">
        Source field: <span className="font-semibold text-slate-200">{widget.field}</span>
      </p>
      {lastUpdated ? (
        <p className="text-xs text-slate-500">Last updated · {formatDateLong(lastUpdated)}</p>
      ) : null}
    </div>
  );
}

type TableWidgetProps = {
  widget: Extract<DashboardWidget, { type: "table" }>;
  rows: DatasetRow[];
};

function TableWidget({ widget, rows }: TableWidgetProps) {
  const tableRows = useMemo(() => {
    return rows.slice(-200).toReversed();
  }, [rows]);

  const columnDefs = useMemo<(ColDef | ColGroupDef)[]>(() => {
    return widget.columns.map((column) => ({
      field: column.field,
      headerName: column.headerName ?? column.field,
      filter: true,
      sortable: true,
      resizable: true,
      minWidth: column.field === "time" ? 160 : 120,
      valueFormatter: (params) => formatNumber(params.value as unknown),
    }));
  }, [widget.columns]);

  return (
    <div className="ag-theme-quartz h-full min-h-[260px] w-full overflow-hidden rounded-xl">
      <AgGridReact
        rowData={tableRows}
        columnDefs={columnDefs}
        defaultColDef={{
          flex: 1,
          sortable: true,
          resizable: true,
        }}
        suppressDragLeaveHidesColumns
        suppressAggFuncInHeader
      />
    </div>
  );
}

export function DashboardRenderer({
  plan,
  datasets,
}: {
  plan: DashboardPlan;
  datasets: DatasetMap;
}) {
  const layout = useMemo(() => computeLayout(plan), [plan]);
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-white">{plan.title}</h2>
        {plan.description ? (
          <p className="text-sm text-slate-300">{plan.description}</p>
        ) : null}
      </header>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gridAutoRows: `${ROW_HEIGHT}px`,
        }}
      >
        {layout.map((item, index) => {
          const widget = plan.widgets[item.widgetIndex];
          if (!widget) return null;
          const datasetState = datasets[widget.datasetId];
          return (
            <div
              key={`${item.widgetIndex}-${index}`}
              style={{
                gridColumn: `${item.x + 1} / span ${item.w}`,
                gridRow: `${item.y + 1} / span ${item.h}`,
                minHeight: `${ROW_HEIGHT * item.h}px`,
              }}
            >
              <WidgetContainer widget={widget} datasetState={datasetState} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
