import { NextRequest, NextResponse } from "next/server";
import { createHuggingFace } from "@ai-sdk/huggingface";
import { generateObject } from "ai";
import {
  DashboardPlanSchema,
  SAMPLE_PLAN,
} from "@/app/(lib)/plan-schema";

const DEFAULT_MODEL =
  process.env.HF_MODEL_ID ?? "meta-llama/Meta-Llama-3.1-8B-Instruct";

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
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    console.error("Failed to read request body", error);
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
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
    const { object } = await generateObject({
      model: hf.text(DEFAULT_MODEL),
      schema: DashboardPlanSchema,
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

    return NextResponse.json({ plan: object, cached: false });
  } catch (error) {
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
