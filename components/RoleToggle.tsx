"use client";

import { useEffect, useState } from "react";

const ROLE_KEY = "sq-genui-role" as const;

export type Role = "builder" | "viewer";

const initialRole = (): Role => {
  if (typeof window === "undefined") {
    return "builder";
  }
  const paramRole = new URLSearchParams(window.location.search).get("role");
  if (paramRole === "viewer") {
    return "viewer";
  }
  const stored = window.localStorage.getItem(ROLE_KEY);
  return stored === "viewer" ? "viewer" : "builder";
};

export const useRole = (): [Role, (role: Role) => void] => {
  const [role, setRole] = useState<Role>(() => initialRole());

  useEffect(() => {
    window.localStorage.setItem(ROLE_KEY, role);
  }, [role]);

  return [role, setRole];
};

export const RoleToggle = ({
  value,
  onChange,
}: {
  value: Role;
  onChange: (role: Role) => void;
}) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs">
    <span className="font-semibold text-slate-400">Mode</span>
    <button
      type="button"
      onClick={() => onChange("builder")}
      className={`rounded-full px-3 py-1 font-medium transition ${
        value === "builder"
          ? "bg-cyan-500 text-slate-950"
          : "text-slate-300 hover:text-cyan-200"
      }`}
    >
      Builder
    </button>
    <button
      type="button"
      onClick={() => onChange("viewer")}
      className={`rounded-full px-3 py-1 font-medium transition ${
        value === "viewer"
          ? "bg-emerald-500 text-slate-950"
          : "text-slate-300 hover:text-emerald-200"
      }`}
    >
      Viewer
    </button>
  </div>
);
