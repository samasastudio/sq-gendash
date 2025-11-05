import { NextRequest, NextResponse } from "next/server";
import { createHuggingFace } from "@ai-sdk/huggingface";
import { generateText } from "ai";
import { DashboardPlanSchema, SAMPLE_PLAN } from "@/app/(lib)/plan-schema";

const DEFAULT_MODEL =
  process.env.HF_MODEL_ID ?? "meta-llama/Llama-3.1-8B-Instruct";

function readPrompt(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = (body as { prompt?: unknown }).prompt;
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(req: NextRequest) {
  let prompt: string | null = null;

  try {
    prompt = readPrompt(await req.json());
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    console.error("Failed to read request body", error);
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      plan: SAMPLE_PLAN,
      cached: true,
      note: "HF_API_KEY missing — returning sample plan for development",
    });
  }

  try {
    const hf = createHuggingFace({ apiKey });
    const { text } = await generateText({
      model: hf(DEFAULT_MODEL),
      system:
        "You are a strict dashboard planning assistant. Return only valid JSON that matches the provided schema.",
      prompt: [
        "Plan a financial markets dashboard for SelectQuote's Generative UI demo.",
        "Use live Alpha Vantage data.",
        "Support KPI tiles, line/area/bar charts, and one tabular view.",
        "Choose compact outputSize unless prompt asks for long history.",
        `User prompt: "${prompt}"`,
      ].join("\n"),
    });

    const plan = buildPlanFromResponse(text);
    return NextResponse.json({ plan, cached: false });
  } catch (error) {
    if (error instanceof PlanBuildError) {
      console.warn("Falling back to sample plan", error.detail);
      return NextResponse.json({
        plan: SAMPLE_PLAN,
        cached: true,
        note: "LLM response could not be parsed — returning sample plan",
        detail: error.detail,
      });
    }

    console.error("Failed to generate plan", error);
    return NextResponse.json(
      {
        error: "Failed to generate dashboard plan",
        detail:
          error instanceof Error ? error.message : "Unknown generation error",
      },
      { status: 500 }
    );
  }
}

function buildPlanFromResponse(text: string) {
  try {
    const extracted = extractJsonObject(text);
    const parsed = DashboardPlanSchema.safeParse(extracted);

    if (!parsed.success) {
      console.warn("LLM returned invalid plan", {
        issues: parsed.error.issues,
        raw: text,
      });
      throw new PlanBuildError("LLM returned invalid plan", {
        issues: parsed.error.issues,
        rawText: text,
      });
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof PlanBuildError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Unexpected plan build error";
    throw new PlanBuildError(message, { rawText: text });
  }
}

function extractJsonObject(text: string): unknown {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenceMatch ? fenceMatch[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || start >= end) {
    throw new Error("LLM response did not contain a JSON object");
  }

  const jsonSlice = candidate.slice(start, end + 1);
  try {
    return JSON.parse(jsonSlice);
  } catch {
    throw new Error("Failed to parse JSON from LLM response");
  }
}

class PlanBuildError extends Error {
  constructor(
    message: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "PlanBuildError";
  }
}
