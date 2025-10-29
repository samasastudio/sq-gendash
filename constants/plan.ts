import type { DashboardDataset } from "@/lib/plan";

export const PLAN_SAMPLE_PROMPTS: readonly string[] = [
  "Build a dashboard for AAPL daily close YTD. Add a KPI for latest close and a line chart of close over time.",
  "Compare AAPL vs MSFT daily closes; show a combined line chart and KPIs for each latest close.",
  "Show SPY daily with 20 & 50 day SMA and a KPI for % change last 30 days.",
];

export const PLAN_STOP_WORDS: readonly string[] = [
  "SMA",
  "EMA",
  "MA",
  "AND",
  "WITH",
  "SHOW",
  "ADD",
  "MAKE",
  "BUILD",
  "KPI",
  "LINE",
  "CHART",
  "TIME",
  "CLOSE",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YTD",
  "VS",
  "COMPARE",
];

export const TIMEFRAME_LABEL: Record<DashboardDataset["function"], string> = {
  TIME_SERIES_DAILY: "Daily",
  TIME_SERIES_WEEKLY: "Weekly",
  TIME_SERIES_MONTHLY: "Monthly",
};

export const TIMEFRAME_SLUG: Record<DashboardDataset["function"], string> = {
  TIME_SERIES_DAILY: "daily",
  TIME_SERIES_WEEKLY: "weekly",
  TIME_SERIES_MONTHLY: "monthly",
};
