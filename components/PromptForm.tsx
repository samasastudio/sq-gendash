"use client";

import { useEffect, useState, type SVGProps } from "react";

type PromptFormProps = {
  loading: boolean;
  initialPrompt?: string;
  presets: readonly string[];
  onSubmit: (prompt: string) => Promise<void>;
  onRebuild?: () => void;
};

const SparklesIcon = (props: SVGProps<SVGSVGElement>) => (
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
    <path d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-5L6 9.4l4.4-1.6L12 3z" />
    <path d="M6 17l.6 1.8L9 19.4l-1.8.6L7 22l-.6-1.8L4.6 19.4 6.4 18z" />
    <path d="M17 5.5l.4 1.2L19 7.1l-1.2.4L17.4 8.7 17 7.5 15.8 7.1l1.2-.4z" />
  </svg>
);

const ResetIcon = (props: SVGProps<SVGSVGElement>) => (
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
    <path d="M4 4v5h5" />
    <path d="M3.5 13a8.5 8.5 0 0 0 8.5 8a8.5 8.5 0 1 0-6.01-14.49" />
  </svg>
);

export const PromptForm = ({
  loading,
  initialPrompt = "",
  presets,
  onSubmit,
  onRebuild,
}: PromptFormProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      return;
    }
    await onSubmit(prompt.trim());
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <form
        onSubmit={submit}
        className="flex flex-col gap-4"
      >
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <SparklesIcon className="h-4 w-4" />
          Describe your dashboard
        </label>
        <textarea
          className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-base text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
          placeholder="e.g. Compare AAPL vs MSFT with SMAs and KPIs"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={loading}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 font-medium text-slate-950 shadow transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            disabled={loading}
          >
            <SparklesIcon className="h-4 w-4" />
            {loading ? "Generating" : "Generate"}
          </button>
          {onRebuild ? (
            <button
              type="button"
              onClick={onRebuild}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400"
            >
              <ResetIcon className="h-4 w-4" />
              Rebuild
            </button>
          ) : null}
        </div>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => setPrompt(sample)}
            className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200"
          >
            {sample}
          </button>
        ))}
      </div>
    </section>
  );
};
