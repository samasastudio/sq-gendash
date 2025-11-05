## SQ-GenDash — Copilot / Agent Quick Instructions

This repository is a Next.js App Router project that turns a natural-language
prompt into a strict JSON `DashboardPlan` which the client renders using
live Alpha Vantage data. Keep instructions concrete and focused on files and
patterns below.

- Big picture: `PromptForm` (client) POSTs `{ prompt }` to `POST /api/plan` ->
  `app/api/plan/route.ts` uses the Vercel AI SDK (`ai` + `@ai-sdk/huggingface`) to
  generate a `DashboardPlan` validated by Zod (`app/(lib)/plan-schema.ts`). The
  client then fetches datasets from `GET /api/alpha` (`app/api/alpha/route.ts`),
  which proxies Alpha Vantage and caches responses via `app/(lib)/cache.ts`.

- Key files to inspect when editing behavior or debugging:
  - `app/api/plan/route.ts` — planner; uses `generateObject` with `DashboardPlanSchema`.
  - `app/(lib)/plan-schema.ts` — the Zod schema and `SAMPLE_PLAN` used as fallback.
  - `app/(components)/PromptForm.tsx` — UI that calls `/api/plan` and loads datasets.
  - `app/(lib)/dashboard-data.ts` — dataset parsing/transforms (Alpha Vantage parsing + SMA indicators).
  - `app/api/alpha/route.ts` — Alpha Vantage proxy, rate-limit handling, TTL env vars.
  - `app/(components)/dashboard/DashboardRenderer.tsx` — rendering widgets (charts, KPIs, tables).

- Important runtime and env conventions:
  - Uses Node >= 20 and pnpm (see `package.json`). Use `pnpm i` and `pnpm dev` for local dev.
  - Secrets must be server-side only (do **not** create `NEXT_PUBLIC_*` for API keys).
  - Required env vars: `ALPHA_VANTAGE_API_KEY`, `HF_API_KEY`. Optional: `HF_MODEL_ID`, `MODEL_PROVIDER`, `OPENAI_API_KEY`.
  - `HF_API_KEY` missing -> planner returns `SAMPLE_PLAN` (useful for offline testing).

- Common failure modes and quick fixes:
  - Planner errors: `app/api/plan/route.ts` wraps the call to `generateObject`; errors from the provider (e.g. "400 status code (no body)") surface in the `detail` field. Check:
    1. `HF_API_KEY` is set and valid.
    2. `HF_MODEL_ID` is compatible with the Hugging Face inference API.
    3. Provider/network issues — reproduce with a simple `curl` POST to `/api/plan`.
  - Alpha Vantage problems: ensure `ALPHA_VANTAGE_API_KEY` is present and watch for `payload.Note` (rate limits) — renderer shows cached data when rate limited.
  - LLM output must be strict JSON matching `DashboardPlanSchema`; otherwise Zod will throw. Use `SAMPLE_PLAN` in `plan-schema.ts` to test renderer without LLM.

- How to programmatically test endpoints (examples you'll use when editing code):
  - POST a prompt to the planner (server must be running):

```json
{ "prompt": "Build a dashboard for AAPL daily close with a KPI and line chart" }
```

Check the planner returns `{ plan: {...} }` (or an error with `detail`).

- Code patterns and project conventions to follow:
  - App Router + server route handlers live in `app/api/*/route.ts`.
  - Schema-first: prefer validating external/generated data with Zod (`plan-schema.ts`).
  - Client fetches server proxy routes (`/api/alpha`, `/api/plan`) — never call Alpha Vantage or HF from client directly.
  - Use `SAMPLE_PLAN` for unit-level UI testing without LLM calls.

If anything here is unclear or you want the instructions expanded (examples for debugging LLM responses, or a short troubleshooting checklist for the planner), tell me which section and I will iterate.
