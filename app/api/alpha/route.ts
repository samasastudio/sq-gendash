import { NextRequest, NextResponse } from "next/server";
import { getCached, setCached } from "@/app/(lib)/cache";

const DAILY_DEFAULT_TTL = 1000 * 60 * 60 * 6; // 6 hours
const INTRADAY_DEFAULT_TTL = 1000 * 60 * 15; // 15 minutes

function getEnvTtl(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const ttl = Number(value);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : fallback;
}

function ttlForFunction(fn: string) {
  const normalized = fn.toUpperCase();
  if (normalized.includes("INTRADAY")) {
    return getEnvTtl(process.env.ALPHA_CACHE_TTL_INTRADAY, INTRADAY_DEFAULT_TTL);
  }
  return getEnvTtl(process.env.ALPHA_CACHE_TTL_DAILY, DAILY_DEFAULT_TTL);
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ALPHA_VANTAGE_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const fn = searchParams.get("fn") ?? searchParams.get("function");
  const symbol = searchParams.get("symbol");

  if (!fn || !symbol) {
    return NextResponse.json(
      { error: "Query params 'fn' (or function) and 'symbol' are required" },
      { status: 400 }
    );
  }

  const upstream = new URL("https://www.alphavantage.co/query");
  searchParams.forEach((value, key) => {
    const k = key === "fn" ? "function" : key;
    upstream.searchParams.set(k, value);
  });
  if (!upstream.searchParams.has("function")) {
    upstream.searchParams.set("function", fn);
  }
  upstream.searchParams.set("apikey", apiKey);

  const cacheKey = upstream.toString().replace(apiKey, "{key}");
  const cached = getCached<unknown>(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached, cached: true });
  }

  const response = await fetch(upstream, {
    headers: { "User-Agent": "sq-gendash/phase-1" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Failed to reach Alpha Vantage",
        statusText: response.statusText,
      },
      { status: 502 }
    );
  }

  const payload = await response.json();
  if (payload.Note) {
    return NextResponse.json(
      { error: "rate_limited", note: payload.Note },
      { status: 429 }
    );
  }

  if (payload["Error Message"]) {
    return NextResponse.json(
      { error: "alpha_error", detail: payload["Error Message"] },
      { status: 400 }
    );
  }

  setCached(cacheKey, payload, ttlForFunction(fn));

  return NextResponse.json({ data: payload, cached: false });
}
