"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { DashboardPlan } from "@/app/(lib)/plan-schema";
import {
  type DatasetState,
  fetchDataset,
} from "@/app/(lib)/dashboard-data";
import { DashboardRenderer } from "@/app/(components)/dashboard/DashboardRenderer";

type PlanResponse =
  | { plan: DashboardPlan; cached: boolean; note?: string }
  | { error: string; detail?: string; note?: string };

export function PromptForm() {
  const [prompt, setPrompt] = useState(
    "Build a dashboard comparing AAPL vs MSFT daily closes with KPIs"
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [datasets, setDatasets] = useState<Record<string, DatasetState>>({});
  const loadTokenRef = useRef<symbol | null>(null);

  const plan = result && "plan" in result ? result.plan : null;

  const loadPlan = useCallback(async (nextPlan: DashboardPlan) => {
    const token = Symbol("plan-load");
    loadTokenRef.current = token;
    const initial = Object.fromEntries(
      nextPlan.datasets.map((dataset) => [dataset.id, { status: "loading" }])
    ) as Record<string, DatasetState>;
    setDatasets(initial);

    await Promise.all(
      nextPlan.datasets.map(async (dataset) => {
        try {
          const data = await fetchDataset(dataset);
          if (loadTokenRef.current !== token) return;
          setDatasets((prev) => ({
            ...prev,
            [dataset.id]: { status: "success", ...data },
          }));
          return;
        } catch (error) {
          if (loadTokenRef.current !== token) return;
          if (!(error instanceof Error)) {
            setDatasets((prev) => ({
              ...prev,
              [dataset.id]: {
                status: "error",
                error: "Unknown dataset error",
              },
            }));
            return;
          }

          const detail = (error as Error & { detail?: string }).detail;
          const note = (error as Error & { note?: string }).note;
          setDatasets((prev) => ({
            ...prev,
            [dataset.id]: {
              status: "error",
              error: error.message,
              detail,
              note,
            },
          }));
        }
      })
    );
  }, []);

  const datasetSummaries = useMemo(() => {
    return Object.entries(datasets).map(([id, state]) => {
      return { id, state };
    });
  }, [datasets]);

  async function submitPrompt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setDatasets({});
    loadTokenRef.current = null;
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = (await response.json()) as PlanResponse;
      setResult(json);
      if (!("plan" in json)) {
        loadTokenRef.current = null;
        setDatasets({});
        return;
      }

      void loadPlan(json.plan);
    } catch (error) {
      setResult({
        error:
          error instanceof Error ? error.message : "Failed to reach planner",
      });
    } finally {
      setLoading(false);
    }
  }

  const error = result && "error" in result ? result : null;

  return (
    <section className="space-y-6">
      <form onSubmit={submitPrompt} className="space-y-4">
        <label className="block text-sm font-medium text-neutral-500">
          Prompt
        </label>
        <textarea
          className="w-full rounded-md border border-neutral-300 bg-white/90 p-3 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          rows={4}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the dashboard you want to generate..."
        />
        <button
          type="submit"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Planning..." : "Generate Plan"}
        </button>
      </form>

      {result?.note ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {result.note}
        </p>
      ) : null}

      {datasetSummaries.length ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Datasets</h2>
          <ul className="space-y-2 text-sm">
            {datasetSummaries.map(({ id, state }) => {
              if (state.status === "loading") {
                return (
                  <li
                    key={id}
                    className="flex items-start justify-between rounded-md border border-slate-700/80 bg-slate-900/60 px-3 py-2"
                  >
                    <span className="font-medium text-slate-200">{id}</span>
                    <span className="text-slate-400">Loading…</span>
                  </li>
                );
              }
              if (state.status === "error") {
                return (
                  <li
                    key={id}
                    className="space-y-1 rounded-md border border-rose-600/60 bg-rose-950/40 px-3 py-2 text-rose-100"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-medium">{id}</span>
                      <span className="font-semibold uppercase tracking-wide">Error</span>
                    </div>
                    <p className="text-xs text-rose-200">{state.error}</p>
                    {state.detail ? (
                      <p className="text-xs text-rose-300">{state.detail}</p>
                    ) : null}
                    {state.note ? (
                      <p className="text-xs text-rose-300">{state.note}</p>
                    ) : null}
                  </li>
                );
              }
              return (
                <li
                  key={id}
                  className="flex items-start justify-between gap-4 rounded-md border border-emerald-600/40 bg-emerald-950/30 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-emerald-200">{id}</p>
                    <p className="text-xs text-emerald-200/80">
                      {state.cached ? "Cached hit" : "Live fetch"}
                    </p>
                    {state.note ? (
                      <p className="text-xs text-emerald-100/70">{state.note}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-emerald-600/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                    Ready
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {plan ? (
        <DashboardRenderer plan={plan} datasets={datasets} />
      ) : null}

      {plan ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Plan JSON</h2>
          <pre className="max-h-[320px] overflow-auto rounded-md border border-neutral-200 bg-neutral-950 p-4 text-xs text-emerald-200">
            {JSON.stringify(plan, null, 2)}
          </pre>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          {error.error}
          {error.detail ? ` — ${error.detail}` : ""}
        </p>
      ) : null}
    </section>
  );
}
