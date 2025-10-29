import { parseDashboardPlan } from "./plan";
import type { DashboardPlan, DashboardDatasetResult } from "./plan";

export const parsePlan = (input: unknown): DashboardPlan =>
  parseDashboardPlan(input);

export type DatasetResponse = {
  data: DashboardDatasetResult;
  provider: string;
  note?: string;
};

export const fetchDataset = async (
  datasetId: string,
  body: unknown,
): Promise<DatasetResponse> => {
  const response = await fetch("/api/alpha", {
    method: "POST",
    body: JSON.stringify({ datasetId, dataset: body }),
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load dataset ${datasetId}`);
  }

  return (await response.json()) as DatasetResponse;
};

export const loadDatasets = async (
  plan: DashboardPlan,
): Promise<{ datasets: Record<string, DashboardDatasetResult>; notes: string[] }> => {
  const responses = await Promise.all(
    plan.datasets.map(async (dataset) => ({
      id: dataset.id,
      response: await fetchDataset(dataset.id, dataset),
    })),
  );

  const datasets = Object.fromEntries(
    responses.map(({ id, response }) => [id, response.data] as const),
  );
  const notes = responses
    .map(({ response }) => response.note)
    .filter((note): note is string => Boolean(note));

  return { datasets, notes };
};
