"use client";

import { useState } from "react";
import type { DashboardPlan } from "@/app/(lib)/plan-schema";

type PlanResponse =
  | { plan: DashboardPlan; cached: boolean; note?: string }
  | { error: string; detail?: string; note?: string };

export function PromptForm() {
  const [prompt, setPrompt] = useState(
    "Build a dashboard comparing AAPL vs MSFT daily closes with KPIs"
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResponse | null>(null);

  async function submitPrompt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = (await response.json()) as PlanResponse;
      setResult(json);
    } catch (error) {
      setResult({
        error:
          error instanceof Error ? error.message : "Failed to reach planner",
      });
    } finally {
      setLoading(false);
    }
  }

  const plan = result && "plan" in result ? result.plan : null;
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

      {plan ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Dashboard Plan</h2>
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
