import { DASHBOARD_STORAGE_KEY } from "@/constants/storage";
import { isBrowser } from "@/utilities/environment";
import { type DashboardPlan, type DashboardDatasetResult } from "./plan";

type Persisted = {
  plan: DashboardPlan;
  datasets: Record<string, DashboardDatasetResult>;
};

export const loadPersisted = (): Persisted | null => {
  if (!isBrowser()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch (error) {
    console.warn("Unable to read dashboard cache", error);
    return null;
  }
};

export const persist = (value: Persisted) => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(value));
};

export const clearPersisted = () => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(DASHBOARD_STORAGE_KEY);
};
