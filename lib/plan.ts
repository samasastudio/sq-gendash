const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isInteger = (value: unknown): value is number =>
  isNumber(value) && Number.isInteger(value);

type IndicatorType = "SMA" | "PCT_CHANGE" | "RESAMPLE";

type IndicatorWindow = "daily" | "weekly" | "monthly";

export type DashboardIndicator = {
  type: IndicatorType;
  period?: number;
  sourceField?: string;
  target?: string;
  window?: IndicatorWindow;
};

export type DashboardDataset = {
  id: string;
  source: "alphaVantage";
  function: "TIME_SERIES_DAILY" | "TIME_SERIES_WEEKLY" | "TIME_SERIES_MONTHLY";
  symbol: string;
  range: {
    from?: string;
    to?: string;
    limit?: number;
  };
  indicators: DashboardIndicator[];
};

export type DashboardWidget =
  | {
      type: "kpi";
      title: string;
      datasetId: string;
      field: string;
      agg: "latest" | "average" | "sum" | "percentChange";
      format: "currency" | "number" | "percent";
    }
  | {
      type: "line" | "bar" | "area";
      title: string;
      datasetId: string;
      x: string;
      y: string[];
    };

type KpiWidget = Extract<DashboardWidget, { type: "kpi" }>;

export type DashboardLayoutItem = {
  widgetIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DashboardPlan = {
  title: string;
  description: string;
  datasets: DashboardDataset[];
  widgets: DashboardWidget[];
  layout: DashboardLayoutItem[];
};

const isIndicatorType = (value: unknown): value is IndicatorType =>
  value === "SMA" || value === "PCT_CHANGE" || value === "RESAMPLE";

const isIndicatorWindow = (value: unknown): value is IndicatorWindow =>
  value === "daily" || value === "weekly" || value === "monthly";

const parseIndicator = (value: unknown): DashboardIndicator | null => {
  if (!isRecord(value) || !isIndicatorType(value.type)) {
    return null;
  }
  const period = isInteger(value.period) && value.period > 0 ? Number(value.period) : undefined;
  const sourceField = isString(value.sourceField) ? value.sourceField : undefined;
  const target = isString(value.target) ? value.target : undefined;
  const window = isIndicatorWindow(value.window) ? value.window : undefined;
  return {
    type: value.type,
    ...(period ? { period } : {}),
    ...(sourceField ? { sourceField } : {}),
    ...(target ? { target } : {}),
    ...(window ? { window } : {}),
  };
};

const parseIndicators = (value: unknown): DashboardIndicator[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((indicator) => parseIndicator(indicator))
    .filter((indicator): indicator is DashboardIndicator => indicator !== null);
};

const parseRange = (value: unknown): DashboardDataset["range"] => {
  if (!isRecord(value)) {
    return {};
  }
  const from = isString(value.from) ? value.from : undefined;
  const to = isString(value.to) ? value.to : undefined;
  const limit =
    isInteger(value.limit) && value.limit > 0 && value.limit <= 500
      ? Number(value.limit)
      : undefined;
  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(limit ? { limit } : {}),
  };
};

const isDatasetFunction = (
  value: unknown,
): value is DashboardDataset["function"] =>
  value === "TIME_SERIES_DAILY" ||
  value === "TIME_SERIES_WEEKLY" ||
  value === "TIME_SERIES_MONTHLY";

const parseDataset = (value: unknown): DashboardDataset | null => {
  if (!isRecord(value)) {
    return null;
  }
  if (!isString(value.id) || !isDatasetFunction(value.function) || !isString(value.symbol)) {
    return null;
  }
  if (value.source !== "alphaVantage") {
    return null;
  }
  return {
    id: value.id,
    source: "alphaVantage",
    function: value.function,
    symbol: value.symbol,
    range: parseRange(value.range),
    indicators: parseIndicators(value.indicators ?? []),
  };
};

export const parseDashboardDataset = (input: unknown): DashboardDataset => {
  const dataset = parseDataset(input);
  if (!dataset) {
    throw new Error("Invalid dataset");
  }
  return cloneDataset(dataset);
};

const isWidgetType = (value: unknown): value is DashboardWidget["type"] =>
  value === "kpi" || value === "line" || value === "bar" || value === "area";

const isAgg = (value: unknown): value is KpiWidget["agg"] =>
  value === "latest" || value === "average" || value === "sum" || value === "percentChange";

const isFormat = (
  value: unknown,
): value is KpiWidget["format"] =>
  value === "currency" || value === "number" || value === "percent";

const parseKpiWidget = (
  title: string,
  datasetId: string,
  value: Record<string, unknown>,
): DashboardWidget | null => {
  if (!isString(value.field) || !isAgg(value.agg)) {
    return null;
  }
  const format = isFormat(value.format) ? value.format : "number";
  return {
    type: "kpi",
    title,
    datasetId,
    field: value.field,
    agg: value.agg,
    format,
  };
};

const parseSeriesWidget = (
  title: string,
  datasetId: string,
  value: Record<string, unknown>,
  widgetType: Exclude<DashboardWidget["type"], "kpi">,
): DashboardWidget | null => {
  if (!isString(value.x) || !Array.isArray(value.y)) {
    return null;
  }
  const series = value.y.filter((entry): entry is string => isString(entry));
  if (series.length === 0) {
    return null;
  }
  return {
    type: widgetType,
    title,
    datasetId,
    x: value.x,
    y: series,
  };
};

const parseWidget = (value: unknown): DashboardWidget | null => {
  if (!isRecord(value) || !isWidgetType(value.type) || !isString(value.title)) {
    return null;
  }
  if (!isString(value.datasetId)) {
    return null;
  }
  if (value.type === "kpi") {
    return parseKpiWidget(value.title, value.datasetId, value);
  }
  return parseSeriesWidget(value.title, value.datasetId, value, value.type);
};

const parseLayoutItem = (value: unknown): DashboardLayoutItem | null => {
  if (!isRecord(value)) {
    return null;
  }
  const { widgetIndex, x, y, w, h } = value;
  if (
    !isInteger(widgetIndex) ||
    widgetIndex < 0 ||
    !isInteger(x) ||
    x < 0 ||
    !isInteger(y) ||
    y < 0 ||
    !isInteger(w) ||
    w <= 0 ||
    !isInteger(h) ||
    h <= 0
  ) {
    return null;
  }
  return { widgetIndex, x, y, w, h };
};

const cloneDataset = (dataset: DashboardDataset): DashboardDataset => ({
  id: dataset.id,
  source: dataset.source,
  function: dataset.function,
  symbol: dataset.symbol,
  range: {
    ...(dataset.range.from ? { from: dataset.range.from } : {}),
    ...(dataset.range.to ? { to: dataset.range.to } : {}),
    ...(dataset.range.limit ? { limit: dataset.range.limit } : {}),
  },
  indicators: dataset.indicators.map((indicator) => ({ ...indicator })),
});

const cloneWidget = (widget: DashboardWidget): DashboardWidget => {
  if (widget.type === "kpi") {
    return { ...widget };
  }
  return {
    ...widget,
    y: [...widget.y],
  };
};

const cloneLayoutItem = (item: DashboardLayoutItem): DashboardLayoutItem => ({
  widgetIndex: item.widgetIndex,
  x: item.x,
  y: item.y,
  w: item.w,
  h: item.h,
});

export const defaultLayout = (widgets: readonly DashboardWidget[]) =>
  widgets.map((widget, index) => ({
    widgetIndex: index,
    x: 0,
    y: index * 4,
    w: widget.type === "kpi" ? 4 : 12,
    h: widget.type === "kpi" ? 2 : 6,
  }));

export const normalisePlan = (plan: DashboardPlan): DashboardPlan => ({
  ...plan,
  layout:
    plan.layout.length === plan.widgets.length
      ? plan.layout
      : defaultLayout(plan.widgets),
});

export const parseDashboardPlan = (input: unknown): DashboardPlan => {
  if (!isRecord(input) || !isString(input.title)) {
    throw new Error("Invalid dashboard plan");
  }

  const datasetsInput = Array.isArray(input.datasets) ? input.datasets : [];
  const widgetsInput = Array.isArray(input.widgets) ? input.widgets : [];
  const layoutInput = Array.isArray(input.layout) ? input.layout : [];

  const datasets = datasetsInput
    .map((dataset) => parseDataset(dataset))
    .filter((dataset): dataset is DashboardDataset => dataset !== null)
    .map((dataset) => cloneDataset(dataset));
  const widgets = widgetsInput
    .map((widget) => parseWidget(widget))
    .filter((widget): widget is DashboardWidget => widget !== null)
    .map((widget) => cloneWidget(widget));
  const layout = layoutInput
    .map((item) => parseLayoutItem(item))
    .filter((item): item is DashboardLayoutItem => item !== null)
    .map((item) => cloneLayoutItem(item));

  if (datasets.length === 0 || widgets.length === 0) {
    throw new Error("Invalid dashboard plan");
  }

  const plan: DashboardPlan = {
    title: input.title,
    description: isString(input.description) ? input.description : "",
    datasets,
    widgets,
    layout,
  };

  return normalisePlan(plan);
};

export type DashboardStorage = {
  plan: DashboardPlan;
  datasets: Record<string, DashboardDatasetResult>;
};

export type DashboardDatasetResult = {
  meta: {
    symbol: string;
    lastRefreshed: string;
  };
  rows: readonly DashboardDataPoint[];
};

export type DashboardDataPoint = {
  time: string;
  values: Record<string, number>;
};
