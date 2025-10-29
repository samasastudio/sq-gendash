"use client";

import type { SVGProps } from "react";

export type StatusBadgesProps = {
  provider: string;
  notes: readonly string[];
  message?: string | null;
  errors?: readonly string[];
};

const DatabaseIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <ellipse cx="12" cy="5" rx="7" ry="3" />
    <path d="M5 5v6c0 1.66 3.13 3 7 3s7-1.34 7-3V5" />
    <path d="M5 11v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
  </svg>
);

const AlertIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

export const StatusBadges = ({
  provider,
  notes,
  message,
  errors = [],
}: StatusBadgesProps) => {
  const filteredErrors = errors.filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
        <DatabaseIcon className="h-3 w-3 text-cyan-400" />
        Data provider: {provider}
      </span>
      {notes.map((note) => (
        <span
          key={note}
          className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-200"
        >
          <AlertIcon className="h-3 w-3" />
          {note}
        </span>
      ))}
      {message ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-slate-300">
          <AlertIcon className="h-3 w-3 text-rose-300" />
          {message}
        </span>
      ) : null}
      {filteredErrors.map((error) => (
        <span
          key={error}
          className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-rose-200"
        >
          <AlertIcon className="h-3 w-3" />
          {error}
        </span>
      ))}
    </div>
  );
};
