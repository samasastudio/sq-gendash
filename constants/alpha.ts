import type { DashboardDatasetResult } from "@/lib/plan";

type ValueFields = DashboardDatasetResult["rows"][number]["values"];

export const ALPHA_FIELD_MAP: Record<string, keyof ValueFields> = {
  "1. open": "open",
  "2. high": "high",
  "3. low": "low",
  "4. close": "close",
  "5. volume": "volume",
};
