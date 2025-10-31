# SQ-GenDash — AI‑Generated Dashboard Builder

> Prompt → Plan → Render dashboards from live market data using **Alpha Vantage**, **Vercel AI SDK v5** (Hugging Face provider), **Next.js (TS)**, **Recharts**, and **AG Grid (Community)**.

---

## Table of Contents

1. [What is this?](#what-is-this)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)

   - [CodeSandbox Quickstart](#codesandbox-quickstart)
   - [Local Development](#local-development)

4. [Features](#features)
5. [Architecture](#architecture)
6. [Environment & Config](#environment--config)
7. [Usage](#usage)

   - [Prompt Examples](#prompt-examples)
   - [LLM‑off Sample Plan JSON](#llm-off-sample-plan-json)

8. [Permissions Teaser (Phase 2)](#permissions-teaser-phase-2)
9. [Performance & VM Sizing Tips](#performance--vm-sizing-tips)
10. [Learn More (Next.js Docs)](#learn-more-nextjs-docs)
11. [Deploy on Vercel](#deploy-on-vercel)
12. [Troubleshooting](#troubleshooting)
13. [Project Phases](#project-phases)
14. [License](#license)

---

## What is this?

**SQ‑GenDash** demonstrates a **Generative UI** workflow: type a natural‑language prompt, the app plans a dashboard (datasets, charts, KPIs, layout) and renders it with live data from **Alpha Vantage**.

Repo: `https://github.com/samasastudio/sq-gendash`

---

## Prerequisites

- Node 18+
- pnpm (recommended)
- Accounts/API keys:

  - **Alpha Vantage** → `ALPHA_VANTAGE_API_KEY`
  - **Hugging Face** Inference API → `HF_API_KEY`

---

## Getting Started

### CodeSandbox Quickstart

1. Fork in CodeSandbox → **Next.js (TypeScript)** → connect to `samasastudio/sq-gendash`.
2. Add **Secrets**: `ALPHA_VANTAGE_API_KEY`, `HF_API_KEY`.
3. Install deps:

   ```bash
   pnpm add ai @ai-sdk/huggingface zod ag-grid-community ag-grid-react recharts class-variance-authority clsx
   pnpm add -D tailwindcss postcss autoprefixer @types/node @types/react
   ```

4. Init Tailwind:

   ```bash
   npx tailwindcss init -p
   # set content to: ./app/**/*.{ts,tsx}
   ```

5. Paste files from `/app` as shown in the spec (API routes, components, lib, CSS).
6. Run the dev server and open the preview.

### Local Development

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Create `.env.local`:

```
ALPHA_VANTAGE_API_KEY=your_key
HF_API_KEY=your_key
```

Install & run:

```bash
pnpm i
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You can start editing by modifying `app/page.tsx`—the page auto‑updates. This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to load **Geist**.

---

## Features

- **Generative UI**: Prompt → **strict JSON** plan (Zod) → render.
- **Live data**: Alpha Vantage via serverless proxy (+ caching & rate‑limit handling).
- **Charts**: Line/Area/Bar via **Recharts**.
- **Tables**: **AG Grid React (Community)**.
- **Permissions Teaser**: Builder ↔ Viewer toggle (client‑only).

---

## Architecture

- **/api/plan** — Vercel AI SDK v5 (Hugging Face provider) → returns `DashboardPlan` JSON.
- **/api/alpha** — server‑side proxy + cache → Alpha Vantage (keeps keys secret).
- **Client** — renders the plan; fetches datasets; draws charts/KPIs/table.

```
User → /api/plan → (LLM) → plan.json → Client → /api/alpha → AlphaVantage → datasets → Recharts/AG Grid
```

---

## Environment & Config

### Required variables

| Name                       | Required                               | Used by               | Notes                                                                           |
| -------------------------- | -------------------------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `ALPHA_VANTAGE_API_KEY`    | ✅                                     | `/api/alpha` (server) | **Do not** expose on client; never prefix with `NEXT_PUBLIC_`.                  |
| `HF_API_KEY`               | ✅ (if using Hugging Face)             | `/api/plan` (server)  | Vercel AI SDK v5 + Hugging Face Inference.                                      |
| `OPENAI_API_KEY`           | Optional (only if you switch provider) | `/api/plan` (server)  | Keep but don’t use unless you change provider.                                  |
| `MODEL_PROVIDER`           | Optional                               | `/api/plan` (server)  | e.g., `huggingface` (default) or `openai`.                                      |
| `HF_MODEL_ID`              | Optional                               | `/api/plan` (server)  | e.g., `meta-llama/Meta-Llama-3.1-8B-Instruct`. Leave empty to use code default. |
| `ALPHA_CACHE_TTL_INTRADAY` | Optional                               | `/api/alpha` (server) | ms; default ~15m if unset.                                                      |
| `ALPHA_CACHE_TTL_DAILY`    | Optional                               | `/api/alpha` (server) | ms; default ~6h if unset.                                                       |

> For Phase 1 you **don’t need any** `NEXT_PUBLIC_*` vars. All secrets stay server‑side.

### Set them in CodeSandbox

1. Open your sandbox → **Secrets** panel (Environment/Secrets).
2. Add:

   - `ALPHA_VANTAGE_API_KEY=...`
   - `HF_API_KEY=...` (and optionally `OPENAI_API_KEY`, `MODEL_PROVIDER`, `HF_MODEL_ID`)

3. **Restart** the server/container to apply.
4. (Optional) Using a file: create `.env.local` with the same keys; Secrets is preferred for privacy.

**Quick validation**

- Visit `/api/alpha?fn=TIME_SERIES_DAILY&symbol=AAPL` in the preview → JSON without a rate‑limit "Note".
- Submit a simple prompt (e.g., “AAPL daily close with a KPI and a line chart”). `/api/plan` should return a JSON `plan`.

### Set them in OpenAI “Codex” / ChatGPT **Projects**

> Projects don’t run your Next.js app; secrets here are for assistants/tools **inside ChatGPT**. You still must set env vars in CodeSandbox (or Vercel) for the live app.

1. Open your **Generative UI Project** → **Project Settings → Secrets**.
2. Add the same keys:

   - `ALPHA_VANTAGE_API_KEY`
   - `HF_API_KEY`
   - (optional) `OPENAI_API_KEY`, `MODEL_PROVIDER`, `HF_MODEL_ID`

3. If the repo is private, ensure the **GitHub connector** is authorized for `samasastudio/sq-gendash`.

### Optional: provider switch

```
MODEL_PROVIDER=huggingface   # or: openai
HF_MODEL_ID=meta-llama/Meta-Llama-3.1-8B-Instruct
OPENAI_API_KEY=sk-...        # only if using openai
```

---

## Usage

### Prompt Examples

- "Build a dashboard for **AAPL** daily close YTD. Add a **KPI** for latest close and a **line chart** of close over time."
- "Compare **AAPL vs MSFT** daily closes; show a combined line chart and KPIs for each latest close."
- "Show **SPY** daily with **20 & 50 day SMA** and a KPI for % change last 30 days."

### LLM‑off Sample Plan JSON

Paste in DevTools Console to render without calling the LLM:

```js
const plan = {
  title: "AAPL Daily — Close & KPI",
  datasets: [
    {
      id: "aapl_daily",
      source: "alphaVantage",
      function: "TIME_SERIES_DAILY",
      symbol: "AAPL",
      indicators: [
        { type: "SMA", period: 20, sourceField: "close" },
        { type: "SMA", period: 50, sourceField: "close" },
      ],
    },
  ],
  widgets: [
    {
      type: "kpi",
      title: "AAPL Latest Close",
      datasetId: "aapl_daily",
      agg: "latest",
      field: "close",
    },
    {
      type: "line",
      title: "AAPL Close with 20/50 SMA",
      datasetId: "aapl_daily",
      x: "time",
      y: ["close", "sma_20", "sma_50"],
    },
  ],
  layout: [
    { widgetIndex: 0, w: 6, h: 2, x: 0, y: 0 },
    { widgetIndex: 1, w: 12, h: 6, x: 0, y: 2 },
  ],
};
localStorage.setItem(
  "sq-genui-dashboard",
  JSON.stringify({ plan, datasets: {} })
);
location.reload();
```

---

## Permissions Teaser (Phase 2)

- Toggle roles via the header switch, or append `?role=viewer` to share a read‑only view.
- Role persists in `localStorage` (`sq-genui-role`).
- Enable by wrapping the page with `RoleProvider` and including `RoleToggle`/`RoleBanner` (see spec’s Phase 2 stub).

---

## Performance & VM Sizing Tips

For CodeSandbox, start small and scale only if you feel lag:

- **vCPU:** 2–4 | **RAM:** 4–8 GiB | **Disk:** 10–20 GB
  Scale to **4 vCPU / 8 GiB** for heavier previews or multiple collaborators. Default quotas are sufficient for this repo.

Tips:

- Cache Alpha Vantage responses; default to **daily** data.
- Use the **Rebuild (no‑LLM)** button when tweaking layout to avoid extra LLM calls.
- Keep console open to see rate‑limit/caching messages.

---

## Learn More (Next.js Docs)

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js GitHub](https://github.com/vercel/next.js)

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme). See the [deployment docs](https://nextjs.org/docs/app/building-your-application/deploying).

---

## Troubleshooting

- **Planning errors**: The planner must output **only JSON**; check `/api/plan` for Zod errors.
- **429 or no data**: You likely hit Alpha Vantage rate‑limits; cached data should still render.
- **Blank charts**: Ensure the parser maps `Time Series` → `{ time, open, high, low, close, volume }`.

---

## Project Phases

- **Phase 0**: Bootstrap (repo, sandbox, envs, Tailwind).
- **Phase 1**: Prompt→Plan→Render MVP (charts, KPI, grid; daily only).
- **Phase 1.1**: Rebuild w/o LLM, toasts, theme.
- **Phase 1.2**: Client‑side indicators & transforms.
- **Phase 2**: Permissions teaser (Builder vs Viewer).

---

## License

MIT for this demo. Libraries follow their own licenses (AG Grid Community, Recharts, Tailwind, Vercel AI SDK).
