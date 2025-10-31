import { PromptForm } from "@/app/(components)/PromptForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">
            Phase 1 · Prompt → Plan → Render
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            SelectQuote Generative Dashboard Planner
          </h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Enter a natural language prompt describing the dashboard you want.
            The planner will produce a strict JSON plan detailing datasets,
            widgets, and layout guidance for the renderer.
          </p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur">
          <PromptForm />
        </div>
      </div>
    </main>
  );
}
