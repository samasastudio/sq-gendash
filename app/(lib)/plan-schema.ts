import { z } from "zod";

export const IndicatorSchema = z.object({
  type: z.enum(["SMA"]),
  period: z.number().int().positive().max(200),
  sourceField: z.enum(["open", "high", "low", "close", "volume"]),
});

export const DatasetSchema = z.object({
  id: z.string().min(1),
  source: z.literal("alphaVantage"),
  function: z
    .string()
    .min(1)
    .describe("Alpha Vantage function name, e.g. TIME_SERIES_DAILY"),
  symbol: z
    .string()
    .min(1)
    .describe("Ticker symbol supported by Alpha Vantage"),
  interval: z
    .string()
    .optional()
    .describe("Interval such as 5min (used for intraday functions)"),
  outputSize: z.enum(["compact", "full"]).optional(),
  indicators: z.array(IndicatorSchema).default([]),
});

const ChartWidgetSchema = z.object({
  type: z.enum(["line", "area", "bar"]),
  title: z.string().min(1),
  datasetId: z.string().min(1),
  x: z.string().default("time"),
  y: z.array(z.string().min(1)).min(1),
});

const KpiWidgetSchema = z.object({
  type: z.literal("kpi"),
  title: z.string().min(1),
  datasetId: z.string().min(1),
  agg: z.enum(["latest", "changePercent"]).default("latest"),
  field: z.string().min(1),
  compareToField: z.string().optional(),
  format: z.enum(["number", "currency", "percent"]).default("number"),
});

const TableWidgetSchema = z.object({
  type: z.literal("table"),
  title: z.string().optional(),
  datasetId: z.string().min(1),
  columns: z
    .array(
      z.object({
        field: z.string().min(1),
        headerName: z.string().optional(),
      })
    )
    .min(1),
});

export const WidgetSchema = z.discriminatedUnion("type", [
  ChartWidgetSchema,
  KpiWidgetSchema,
  TableWidgetSchema,
]);

export const LayoutSchema = z.object({
  widgetIndex: z.number().int().nonnegative(),
  w: z.number().int().positive().max(12),
  h: z.number().int().positive().max(12),
  x: z.number().int().nonnegative().max(11),
  y: z.number().int().nonnegative(),
});

export const DashboardPlanSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  datasets: z.array(DatasetSchema).min(1),
  widgets: z.array(WidgetSchema).min(1),
  layout: z.array(LayoutSchema).optional(),
});

export type DashboardPlan = z.infer<typeof DashboardPlanSchema>;
export type DashboardWidget = z.infer<typeof WidgetSchema>;
export type DashboardDataset = z.infer<typeof DatasetSchema>;

export const SAMPLE_PLAN: DashboardPlan = {
  title: "AAPL Daily — Close & KPIs",
  datasets: [
    {
      id: "aapl_daily",
      source: "alphaVantage",
      function: "TIME_SERIES_DAILY",
      symbol: "AAPL",
      indicators: [
        { type: "SMA", period: 20, sourceField: "close" },
        { type: "SMA", period: 50, sourceField: "close" },
      ],
    },
  ],
  widgets: [
    {
      type: "kpi",
      title: "AAPL Latest Close",
      datasetId: "aapl_daily",
      agg: "latest",
      field: "close",
      format: "currency",
    },
    {
      type: "line",
      title: "AAPL Close with 20 & 50 SMA",
      datasetId: "aapl_daily",
      x: "time",
      y: ["close", "sma_20", "sma_50"],
    },
    {
      type: "table",
      title: "Recent Daily Bars",
      datasetId: "aapl_daily",
      columns: [
        { field: "time", headerName: "Date" },
        { field: "open" },
        { field: "high" },
        { field: "low" },
        { field: "close" },
        { field: "volume" },
      ],
    },
  ],
  layout: [
    { widgetIndex: 0, w: 4, h: 2, x: 0, y: 0 },
    { widgetIndex: 1, w: 8, h: 6, x: 4, y: 0 },
    { widgetIndex: 2, w: 12, h: 6, x: 0, y: 6 },
  ],
};
