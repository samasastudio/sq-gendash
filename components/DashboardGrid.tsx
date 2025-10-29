"use client";

import type {
  DashboardDatasetResult,
  DashboardLayoutItem,
  DashboardWidget,
} from "@/lib/plan";
import { CHART_COLORS } from "@/constants/dashboard";
import { formatKpiValue, toChartData } from "@/helpers/dashboardGrid";
const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const clampValue = (value: number) =>
  Number.isFinite(value) ? value : 0;

const Chart = ({
  widget,
  dataset,
}: {
  widget: Extract<DashboardWidget, { type: "line" | "area" | "bar" }>;
  dataset: DashboardDatasetResult;
}) => {
  const chartData = toChartData(dataset.rows);

  const series = widget.y.map((field, index) => ({
    field,
    color: CHART_COLORS[index % CHART_COLORS.length],
    points: chartData.map((row, pointIndex) => ({
      index: pointIndex,
      value: clampValue(Number(row[field] ?? 0)),
    })),
  }));

  const values = series.flatMap((entry) =>
    entry.points.map((point) => point.value),
  );

  const extremes = values.reduce(
    (range, value) => ({
      min: Math.min(range.min, value),
      max: Math.max(range.max, value),
    }),
    { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  );

  const rawMin = Number.isFinite(extremes.min) ? extremes.min : 0;
  const rawMax = Number.isFinite(extremes.max) ? extremes.max : rawMin + 1;
  const singleValue = rawMin === rawMax;
  const minValue = singleValue ? rawMin - 1 : rawMin;
  const maxValue = singleValue ? rawMax + 1 : rawMax;
  const width = 640;
  const height = 240;
  const paddingX = 56;
  const paddingY = 32;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const horizontalDivisions = 4;
  const verticalSteps = Math.max(chartData.length - 1, 1);
  const columnWidth = chartData.length > 0 ? innerWidth / chartData.length : innerWidth;
  const step = chartData.length <= 1 ? 0 : innerWidth / verticalSteps;
  const xForIndex = (index: number) =>
    chartData.length <= 1
      ? paddingX + innerWidth / 2
      : paddingX + step * index;
  const yForValue = (value: number) => {
    const ratio = (value - minValue) / (maxValue - minValue || 1);
    return height - paddingY - ratio * innerHeight;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No data available
      </div>
    );
  }

  const gridLines = Array.from({ length: horizontalDivisions + 1 }, (_, index) => {
    const ratio = index / horizontalDivisions;
    const y = height - paddingY - ratio * innerHeight;
    const value = maxValue - (maxValue - minValue) * ratio;
    return {
      key: `grid-${index}`,
      y,
      value,
    };
  });

  const firstLabel = chartData[0]?.[widget.x];
  const lastLabel = chartData[chartData.length - 1]?.[widget.x];
  const xLabels = chartData.length === 1
    ? [{ value: String(firstLabel ?? "") }]
    : uniqueLabels([String(firstLabel ?? ""), String(lastLabel ?? "")]);

  const baselineValue = Math.min(minValue, 0);
  const baselineY = yForValue(baselineValue);

  const legend = series.map((entry) => ({
    field: entry.field,
    color: entry.color,
  }));

  const renderLines = () =>
    series.map((entry) => {
      const path = entry.points.reduce((acc, point, index) => {
        const command = index === 0 ? "M" : "L";
        const nextSegment = `${command}${xForIndex(point.index)},${yForValue(point.value)}`;
        return acc === "" ? nextSegment : `${acc} ${nextSegment}`;
      }, "");

      if (widget.type === "area") {
        const firstPoint = entry.points[0];
        const lastPoint = entry.points[entry.points.length - 1];
        const startX = firstPoint ? xForIndex(firstPoint.index) : paddingX;
        const endX = lastPoint ? xForIndex(lastPoint.index) : paddingX + innerWidth;
        const areaPath =
          path === ""
            ? ""
            : `${path} L${endX},${baselineY} L${startX},${baselineY} Z`;
        return (
          <g key={`${entry.field}-area`}>
            <path
              d={areaPath}
              fill={`${entry.color}33`}
              stroke={entry.color}
              strokeWidth={2}
            />
          </g>
        );
      }

      return (
        <path
          key={`${entry.field}-line`}
          d={path}
          fill="none"
          stroke={entry.color}
          strokeWidth={2}
        />
      );
    });

  const bars = widget.type === "bar"
    ? series.flatMap((entry, seriesIndex) =>
        entry.points.map((point) => {
          const base = chartData.length <= 1
            ? paddingX + innerWidth / 2
            : paddingX + step * point.index;
          const groupWidth = columnWidth;
          const barWidth =
            (groupWidth / Math.max(widget.y.length, 1)) * 0.6;
          const offset =
            (groupWidth - barWidth * widget.y.length) / 2 +
            seriesIndex * barWidth;
          const x = base - groupWidth / 2 + offset;
          const valueY = yForValue(point.value);
          const y = Math.min(valueY, baselineY);
          const heightValue = Math.abs(baselineY - valueY);
          return {
            key: `${entry.field}-${point.index}`,
            x,
            y,
            width: barWidth,
            height: heightValue,
            color: entry.color,
          };
        }),
      )
    : [];

  return (
    <div className="flex h-full flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <rect
          x={paddingX}
          y={paddingY}
          width={innerWidth}
          height={innerHeight}
          fill="#020617"
          stroke="#1e293b"
        />
        {gridLines.map((line) => (
          <g key={line.key}>
            <line
              x1={paddingX}
              x2={paddingX + innerWidth}
              y1={line.y}
              y2={line.y}
              stroke="#1f2937"
              strokeDasharray="4 4"
            />
            <text
              x={paddingX - 8}
              y={line.y + 4}
              textAnchor="end"
              className="fill-slate-500 text-[10px]"
            >
              {numberFormatter.format(line.value)}
            </text>
          </g>
        ))}
        <line
          x1={paddingX}
          x2={paddingX + innerWidth}
          y1={baselineY}
          y2={baselineY}
          stroke="#334155"
        />
        {widget.type === "bar"
          ? bars.map((bar) => (
              <rect
                key={bar.key}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={bar.color}
                rx={4}
              />
            ))
          : renderLines()}
        {widget.type === "line" && (
          <g>
            {series.map((entry) =>
              entry.points.map((point) => (
                <circle
                  key={`${entry.field}-point-${point.index}`}
                  cx={xForIndex(point.index)}
                  cy={yForValue(point.value)}
                  r={1.5}
                  fill={entry.color}
                />
              )),
            )}
          </g>
        )}
        <line
          x1={paddingX}
          x2={paddingX}
          y1={paddingY}
          y2={paddingY + innerHeight}
          stroke="#334155"
        />
        <line
          x1={paddingX}
          x2={paddingX + innerWidth}
          y1={paddingY + innerHeight}
          y2={paddingY + innerHeight}
          stroke="#334155"
        />
        {xLabels.map((label, index) => (
          <text
            key={`x-${index}-${label.value}`}
            x={
              chartData.length <= 1
                ? paddingX + innerWidth / 2
                : index === 0
                  ? paddingX
                  : paddingX + innerWidth
            }
            y={paddingY + innerHeight + 16}
            textAnchor={index === 0 && chartData.length > 1 ? "start" : chartData.length > 1 ? "end" : "middle"}
            className="fill-slate-500 text-[10px]"
          >
            {String(label.value)}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        {legend.map((entry) => (
          <span key={entry.field} className="inline-flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.field}
          </span>
        ))}
      </div>
    </div>
  );
};

const uniqueLabels = (labels: readonly string[]) =>
  labels
    .filter((label) => label)
    .filter((label, index, list) => list.indexOf(label) === index)
    .map((value) => ({ value }));

const WidgetFrame = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow">
    <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
    <div className="mt-3 flex-1 overflow-hidden text-slate-100">{children}</div>
  </div>
);

export const DashboardGrid = ({
  widgets,
  layout,
  datasets,
}: {
  widgets: readonly DashboardWidget[];
  layout: readonly DashboardLayoutItem[];
  datasets: Record<string, DashboardDatasetResult>;
}) => (
  <div className="grid auto-rows-[minmax(120px,_auto)] grid-cols-12 gap-4">
    {layout.map((item) => {
      const widget = widgets[item.widgetIndex];
      const dataset = datasets[widget?.datasetId ?? ""];
      if (!widget || !dataset) {
        return null;
      }
      return (
        <div
          key={`${widget.type}-${item.widgetIndex}`}
          className="col-span-12"
          style={{
            gridColumn: `span ${item.w} / span ${item.w}`,
            gridRow: `span ${item.h} / span ${item.h}`,
          }}
        >
          <WidgetFrame title={widget.title}>
            {widget.type === "kpi" ? (
              <div className="flex h-full flex-col justify-center">
                <span className="text-4xl font-bold">
                  {formatKpiValue(widget, dataset)}
                </span>
                <span className="text-xs text-slate-400">
                  Last updated {dataset.meta.lastRefreshed}
                </span>
              </div>
            ) : (
              <div className="h-64">
                <Chart widget={widget} dataset={dataset} />
              </div>
            )}
          </WidgetFrame>
        </div>
      );
    })}
  </div>
);
