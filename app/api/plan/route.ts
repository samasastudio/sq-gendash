import { NextResponse } from "next/server";

import {
  PLAN_SAMPLE_PROMPTS,
  PLAN_STOP_WORDS,
  TIMEFRAME_LABEL,
  TIMEFRAME_SLUG,
} from "@/constants/plan";
import aaplPlan from "@/data/samples/aapl-plan.json" assert { type: "json" };
import {
  normalisePlan,
  parseDashboardPlan,
  type DashboardDataset,
  type DashboardWidget,
} from "@/lib/plan";
import { parsePlanRequestBody } from "@/schemas/plan";

type TimeSeriesFunction = DashboardDataset["function"];

type IndicatorOption = {
  when: boolean;
  indicator: DashboardDataset["indicators"][number];
};

const fallbackPlan = () => parseDashboardPlan(aaplPlan);

const unique = <Value,>(values: readonly Value[]) =>
  values.filter((value, index, list) => list.indexOf(value) === index);

const parseSymbols = (prompt: string) => {
  const matches = prompt.toUpperCase().match(/\b[A-Z]{1,5}\b/g) ?? [];
  const filtered = matches.filter(
    (symbol) => !PLAN_STOP_WORDS.some((word) => word === symbol),
  );
  return unique(filtered).slice(0, 4);
};

const timeframeFromPrompt = (prompt: string): TimeSeriesFunction => {
  if (/monthly|month/i.test(prompt)) {
    return "TIME_SERIES_MONTHLY";
  }
  if (/weekly|week/i.test(prompt)) {
    return "TIME_SERIES_WEEKLY";
  }
  return "TIME_SERIES_DAILY";
};

const selectIndicators = (options: readonly IndicatorOption[]) =>
  options.filter((option) => option.when).map((option) => option.indicator);

const createDataset = (
  symbol: string,
  timeSeries: TimeSeriesFunction,
  wantsSma: boolean,
  wantsPctChange: boolean,
): DashboardDataset => {
  const rangeLimit = timeSeries === "TIME_SERIES_DAILY" ? 120 : 104;
  const indicators = selectIndicators([
    {
      when: wantsSma,
      indicator: { type: "SMA", period: 20, sourceField: "close" },
    },
    {
      when: wantsSma,
      indicator: { type: "SMA", period: 50, sourceField: "close" },
    },
    {
      when: wantsPctChange,
      indicator: { type: "PCT_CHANGE", period: 30, sourceField: "close" },
    },
  ]);

  return {
    id: `${symbol.toLowerCase()}_${TIMEFRAME_SLUG[timeSeries]}`,
    source: "alphaVantage",
    function: timeSeries,
    symbol,
    range: { limit: rangeLimit },
    indicators,
  } satisfies DashboardDataset;
};

const closeKpi = (dataset: DashboardDataset): DashboardWidget => ({
  type: "kpi",
  title: `${dataset.symbol} Latest Close`,
  datasetId: dataset.id,
  field: "close",
  agg: "latest",
  format: "currency",
});

const pctChangeKpi = (dataset: DashboardDataset): DashboardWidget => ({
  type: "kpi",
  title: `${dataset.symbol} 30d % Change`,
  datasetId: dataset.id,
  field: "pct_change_30",
  agg: "latest",
  format: "percent",
});

const lineWidget = (
  dataset: DashboardDataset,
  wantsSma: boolean,
): DashboardWidget => {
  const baseFields = ["close"];
  const trendFields = wantsSma ? ["sma_20", "sma_50"] : [];
  return {
    type: "line",
    title: `${dataset.symbol} ${TIMEFRAME_LABEL[dataset.function]} Trend`,
    datasetId: dataset.id,
    x: "time",
    y: [...baseFields, ...trendFields],
  } satisfies DashboardWidget;
};

const buildPlanTitle = (
  datasets: readonly DashboardDataset[],
  timeSeries: TimeSeriesFunction,
) => {
  const joined = datasets.map((dataset) => dataset.symbol).join(" vs ");
  return `${joined} ${TIMEFRAME_LABEL[timeSeries]} Dashboard`;
};

const buildPlan = (prompt: string) => {
  const trimmed = prompt.trim();
  const parsedSymbols = parseSymbols(trimmed);
  const symbols = parsedSymbols.length > 0 ? parsedSymbols : ["AAPL"];
  const timeSeries = timeframeFromPrompt(trimmed);
  const wantsSma = /sma|moving average/i.test(trimmed);
  const wantsPctChange = /pct|percent|percentage|change/i.test(trimmed);
  const datasets = symbols.map((symbol) =>
    createDataset(symbol, timeSeries, wantsSma, wantsPctChange),
  );
  const closeWidgets = datasets.map((dataset) => closeKpi(dataset));
  const pctWidgets = wantsPctChange
    ? datasets.map((dataset) => pctChangeKpi(dataset))
    : [];
  const trendWidgets = datasets.map((dataset) => lineWidget(dataset, wantsSma));
  const widgets = [...closeWidgets, ...pctWidgets, ...trendWidgets];

  return normalisePlan({
    title: buildPlanTitle(datasets, timeSeries),
    description: trimmed,
    datasets,
    widgets,
    layout: [],
  });
};

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => ({}));
  const body = parsePlanRequestBody(rawBody);

  if (!body) {
    return NextResponse.json(
      {
        error: "Prompt is required",
      },
      { status: 400 },
    );
  }

  try {
    const plan = buildPlan(body.prompt);
    return NextResponse.json({
      plan,
      provider: "local",
      presets: PLAN_SAMPLE_PROMPTS,
    });
  } catch (error) {
    console.error("Plan generation failed", error);
    return NextResponse.json(
      {
        plan: fallbackPlan(),
        provider: "sample",
        presets: PLAN_SAMPLE_PROMPTS,
        message: "Falling back to sample plan due to generation error",
      },
      { status: 500 },
    );
  }
}
