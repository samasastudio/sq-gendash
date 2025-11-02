import type { DashboardDataset } from "@/app/(lib)/plan-schema";

export type DatasetRow = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  [key: string]: string | number | null;
};

export type DatasetSuccess = {
  rows: DatasetRow[];
  cached: boolean;
  note?: string;
};

export type DatasetError = {
  status: "error";
  error: string;
  detail?: string;
  note?: string;
};

export type DatasetLoading = { status: "loading" };

export type DatasetState = DatasetLoading | DatasetError | ({ status: "success" } & DatasetSuccess);

const FIELD_MAPPINGS: Record<string, string[]> = {
  open: ["1. open", "open", "Open"],
  high: ["2. high", "high", "High"],
  low: ["3. low", "low", "Low"],
  close: ["4. close", "close", "Close"],
  volume: ["5. volume", "volume", "Volume"],
};

function parseNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function resolveField(record: Record<string, unknown>, key: keyof typeof FIELD_MAPPINGS) {
  return (
    FIELD_MAPPINGS[key]
      .map((candidate) => parseNumber(record[candidate]))
      .find((value): value is number => value != null) ?? null
  );
}

function extractTimeSeries(payload: Record<string, unknown>) {
  const seriesKey = Object.keys(payload).find((key) =>
    key.toLowerCase().includes("time series")
  );
  if (!seriesKey) return null;
  const series = payload[seriesKey];
  return typeof series === "object" && series ? (series as Record<string, unknown>) : null;
}

function computeSma(rows: DatasetRow[], field: string, period: number, outputKey: string) {
  return rows.reduce(
    ({ result, window }, row) => {
      const value = parseNumber(row[field]);
      if (value == null) {
        return {
          result: [...result, { ...row, [outputKey]: null }],
          window,
        };
      }

      const nextWindow = [...window, value].slice(-period);
      const average =
        nextWindow.length === period
          ? nextWindow.reduce((sum, current) => sum + current, 0) / period
          : null;

      return {
        result: [
          ...result,
          {
            ...row,
            [outputKey]:
              average != null && Number.isFinite(average)
                ? Number(average.toFixed(4))
                : null,
          },
        ],
        window: nextWindow,
      };
    },
    { result: [] as DatasetRow[], window: [] as number[] }
  ).result;
}

function applyIndicators(rows: DatasetRow[], dataset: DashboardDataset) {
  return (dataset.indicators ?? []).reduce((accRows, indicator) => {
    if (indicator.type !== "SMA") {
      return accRows;
    }
    const key = `sma_${indicator.period}`;
    return computeSma(accRows, indicator.sourceField, indicator.period, key);
  }, rows);
}

function transformAlphaSeries(dataset: DashboardDataset, payload: unknown): DatasetRow[] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Alpha Vantage payload missing body");
  }
  const series = extractTimeSeries(payload as Record<string, unknown>);
  if (!series) {
    throw new Error("Alpha Vantage response missing time series data");
  }
  const rows = Object.entries(series)
    .map(([time, values]) => {
      if (!values || typeof values !== "object") return null;
      const record = values as Record<string, unknown>;
      const open = resolveField(record, "open");
      const high = resolveField(record, "high");
      const low = resolveField(record, "low");
      const close = resolveField(record, "close");
      const volume = resolveField(record, "volume") ?? 0;

      if (open == null || high == null || low == null || close == null) {
        return null;
      }

      return {
        time,
        open,
        high,
        low,
        close,
        volume,
      } satisfies DatasetRow;
    })
    .filter((row): row is DatasetRow => row != null)
    .toSorted(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

  return applyIndicators(rows, dataset);
}

function buildAlphaParams(dataset: DashboardDataset) {
  const entries: Array<[string, string]> = [
    ["fn", dataset.function],
    ["symbol", dataset.symbol],
  ];

  return new URLSearchParams([
    ...entries,
    ...(dataset.interval ? [["interval", dataset.interval]] : []),
    ...(dataset.outputSize ? [["outputsize", dataset.outputSize]] : []),
  ]);
}

export async function fetchDataset(dataset: DashboardDataset): Promise<DatasetSuccess> {
  const params = buildAlphaParams(dataset);
  const response = await fetch(`/api/alpha?${params.toString()}`, {
    method: "GET",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    const errorPayload = (payload ?? {}) as Record<string, unknown>;
    const error =
      (typeof errorPayload.error === "string" && errorPayload.error) ||
      response.statusText ||
      "Failed to fetch dataset";
    const detail =
      (typeof errorPayload.detail === "string" && errorPayload.detail) ||
      (typeof errorPayload.note === "string" && errorPayload.note) ||
      undefined;
    const note =
      typeof errorPayload.note === "string" ? errorPayload.note : undefined;
    throw Object.assign(new Error(error), { detail, note });
  }

  const data = (payload as Record<string, unknown>).data;
  const cached = Boolean((payload as Record<string, unknown>).cached);
  const note =
    typeof (payload as Record<string, unknown>).note === "string"
      ? (payload as Record<string, unknown>).note
      : undefined;
  if (!data || typeof data !== "object") {
    throw new Error("Alpha Vantage response missing data payload");
  }
  const rows = transformAlphaSeries(dataset, data);
  if (!rows.length) {
    throw new Error("Dataset returned no rows after parsing");
  }
  return { rows, cached, note };
}
