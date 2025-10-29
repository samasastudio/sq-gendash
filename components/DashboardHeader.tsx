"use client";

import type { Role } from "@/components/RoleToggle";
import { RoleToggle } from "@/components/RoleToggle";

export type DashboardHeaderProps = {
  headline: string;
  onClear: () => void;
  onRoleChange: (role: Role) => void;
  role: Role;
};

export const DashboardHeader = ({
  headline,
  onClear,
  onRoleChange,
  role,
}: DashboardHeaderProps) => (
  <header className="flex flex-wrap items-center justify-between gap-4">
    <div className="flex flex-col">
      <span className="text-sm uppercase tracking-[0.3em] text-cyan-400">Phase 1 Demo</span>
      <h1 className="text-2xl font-semibold text-slate-50">{headline}</h1>
      <p className="text-sm text-slate-400">
        Prompt-to-dashboard builder using Vercel AI SDK, Alpha Vantage, and live charts.
      </p>
    </div>
    <div className="flex items-center gap-3">
      <RoleToggle value={role} onChange={onRoleChange} />
      <button
        type="button"
        onClick={onClear}
        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-rose-400 hover:text-rose-200"
      >
        Clear cache
      </button>
    </div>
  </header>
);
