"use client";

import { DashboardGrid } from "@/components/DashboardGrid";
import type { DashboardDatasetResult, DashboardPlan } from "@/lib/plan";
import type { SVGProps } from "react";

export type PlanViewerProps = {
  plan: DashboardPlan | null;
  datasets: Record<string, DashboardDatasetResult>;
  isFetching: boolean;
  ready: boolean;
};

const SpinnerIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="9" opacity="0.2" />
    <path d="M21 12a9 9 0 0 0-9-9" />
  </svg>
);

export const PlanViewer = ({ plan, datasets, isFetching, ready }: PlanViewerProps) => {
  if (!plan) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-10 text-center text-sm text-slate-500">
        Use the prompt above to assemble a dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-xl font-semibold text-slate-50">{plan.title}</h2>
        {plan.description ? (
          <p className="text-sm text-slate-400">{plan.description}</p>
        ) : null}
      </div>
      {isFetching ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          <SpinnerIcon className="h-4 w-4 animate-spin" />
          Fetching Alpha Vantage data…
        </div>
      ) : null}
      {ready ? (
        <DashboardGrid widgets={plan.widgets} layout={plan.layout} datasets={datasets} />
      ) : !isFetching ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-10 text-center text-sm text-slate-500">
          Generate a plan to see charts render here.
        </div>
      ) : null}
    </div>
  );
};
