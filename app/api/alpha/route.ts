import { NextResponse } from "next/server";
import { cache } from "react";

import { ALPHA_FIELD_MAP } from "@/constants/alpha";
import fallback from "@/data/samples/aapl-daily.json" assert { type: "json" };
import {
  parseDashboardDataset,
  type DashboardDataset,
  type DashboardDatasetResult,
  type DashboardDataPoint,
  type DashboardIndicator,
} from "@/lib/plan";
import { parseAlphaRequestBody } from "@/schemas/alpha";

const cachedFetch = cache(async (url: string) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "sq-gendash-demo",
    },
    next: {
      revalidate: 300,
    },
  });
  return response.json();
});

const alphaKey = () => process.env.ALPHA_VANTAGE_API_KEY ?? "demo";

type AlphaSeries = Record<string, Record<string, string>>;

type AlphaResponse = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

const isRecordOfStrings = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");

const isAlphaSeries = (value: unknown): value is AlphaSeries =>
  isRecord(value) && Object.values(value).every((entry) => isRecordOfStrings(entry));

const extractSeries = (json: AlphaResponse): AlphaSeries | null =>
  Object.entries(json).reduce<AlphaSeries | null>((found, [key, value]) => {
    if (found) {
      return found;
    }
    return key.includes("Time Series") && isAlphaSeries(value) ? value : null;
  }, null);

const parseRows = (series: AlphaSeries): readonly DashboardDataPoint[] =>
  Object.entries(series)
    .map(([time, values]) => {
      const parsed = Object.entries(values).reduce<Record<string, number>>(
        (accumulator, [key, value]) => {
          const mappedField = ALPHA_FIELD_MAP[key];
          if (!mappedField) {
            return accumulator;
          }
          return {
            ...accumulator,
            [mappedField]: Number.parseFloat(value),
          };
        },
        {},
      );
      return { time, values: parsed };
    })
    .sort((a, b) => a.time.localeCompare(b.time));

const applySmaIndicator = (
  rows: readonly DashboardDataPoint[],
  indicator: DashboardIndicator,
) => {
  const field = indicator.sourceField ?? "close";
  const period = indicator.period ?? 5;
  const target = indicator.target ?? `sma_${period}`;

  return rows.map((row, index, source) => {
    const start = Math.max(0, index - period + 1);
    const window = source.slice(start, index + 1);
    const { sum, count } = window.reduce(
      (totals, entry) => {
        const candidate = entry.values[field];
        if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
          return totals;
        }
        return {
          sum: totals.sum + candidate,
          count: totals.count + 1,
        };
      },
      { sum: 0, count: 0 },
    );
    const average = count > 0 ? sum / count : 0;
    const nextValue = Number.isFinite(average) ? Number(average.toFixed(4)) : 0;
    return {
      ...row,
      values: {
        ...row.values,
        [target]: nextValue,
      },
    };
  });
};

const applyPercentChangeIndicator = (
  rows: readonly DashboardDataPoint[],
  indicator: DashboardIndicator,
) => {
  const field = indicator.sourceField ?? "close";
  const period = indicator.period ?? 1;
  const target = indicator.target ?? `pct_change_${period}`;

  return rows.map((row, index, source) => {
    const baseIndex = Math.max(index - period, 0);
    const currentValue = row.values[field] ?? 0;
    const baseValue = source[baseIndex]?.values[field] ?? currentValue;
    const change = baseValue === 0 ? 0 : (currentValue - baseValue) / baseValue;
    const nextValue = Number.isFinite(change) ? Number(change.toFixed(4)) : 0;
    return {
      ...row,
      values: {
        ...row.values,
        [target]: nextValue,
      },
    };
  });
};

const applyIndicators = (
  rows: readonly DashboardDataPoint[],
  indicators: readonly DashboardIndicator[],
): readonly DashboardDataPoint[] => {
  if (!indicators || indicators.length === 0) {
    return rows;
  }

  const initialiseRows = rows.map((row) => ({
    time: row.time,
    values: { ...row.values },
  }));

  return (indicators ?? [])
    .filter((indicator): indicator is DashboardIndicator => Boolean(indicator))
    .reduce<readonly DashboardDataPoint[]>((currentRows, indicator) => {
      if (indicator.type === "SMA") {
        return applySmaIndicator(currentRows, indicator);
      }

      if (indicator.type === "PCT_CHANGE") {
        return applyPercentChangeIndicator(currentRows, indicator);
      }

      return currentRows;
    }, initialiseRows);
};

const applyRange = (
  rows: readonly DashboardDataPoint[],
  range: DashboardDataset["range"],
): readonly DashboardDataPoint[] => {
  const filtered = rows.filter((row) => {
    const afterFrom = range?.from ? row.time >= range.from : true;
    const beforeTo = range?.to ? row.time <= range.to : true;
    return afterFrom && beforeTo;
  });
  if (!range?.limit) {
    return filtered;
  }
  return filtered.slice(-range.limit);
};

const buildDataset = (
  dataset: DashboardDataset,
  json: AlphaResponse,
): DashboardDatasetResult => {
  const series = extractSeries(json);
  if (!series) {
    return fallback;
  }
  const ranged = applyRange(parseRows(series), dataset.range ?? {});
  const rows = applyIndicators(ranged, dataset.indicators ?? []);
  const metaEntry = json["Meta Data"];
  const meta = isRecordOfStrings(metaEntry) ? metaEntry : undefined;
  return {
    meta: {
      symbol: meta?.["2. Symbol"] ?? dataset.symbol,
      lastRefreshed: meta?.["3. Last Refreshed"] ?? new Date().toISOString().slice(0, 10),
    },
    rows,
  };
};

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => ({}));
  const body = parseAlphaRequestBody(rawBody);

  if (!body) {
    return NextResponse.json({ error: "Missing dataset" }, { status: 400 });
  }

  const dataset = parseDashboardDataset(body.dataset);

  if (process.env.ALPHA_VANTAGE_API_KEY === undefined && alphaKey() === "demo") {
    return NextResponse.json({
      data: fallback,
      provider: "sample",
      note: "Using bundled Alpha Vantage sample",
    });
  }

  const params = new URLSearchParams({
    function: dataset.function,
    symbol: dataset.symbol,
    apikey: alphaKey(),
    outputsize: "compact",
    datatype: "json",
  });

  const url = `https://www.alphavantage.co/query?${params.toString()}`;

  try {
    const raw = await cachedFetch(url);
    const json: AlphaResponse = isRecord(raw) ? raw : {};
    const noteEntry = json["Note"];
    const note = typeof noteEntry === "string" ? noteEntry : undefined;
    if (note) {
      return NextResponse.json({
        data: fallback,
        provider: "alphaVantage",
        note,
      });
    }
    const informationEntry = json["Information"];
    const information = typeof informationEntry === "string" ? informationEntry : undefined;
    if (information) {
      return NextResponse.json({
        data: fallback,
        provider: "alphaVantage",
        note: information,
      });
    }

    return NextResponse.json({
      data: buildDataset(dataset, json),
      provider: "alphaVantage",
    });
  } catch (error) {
    console.error("Alpha Vantage fetch failed", error);
    return NextResponse.json({
      data: fallback,
      provider: "sample",
      note: "Failed to load Alpha Vantage data; using cached sample",
    });
  }
}
