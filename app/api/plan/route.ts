import { NextRequest, NextResponse } from "next/server";
import { createHfModel } from "@ai-sdk/huggingface";
import { generateObject } from "ai";
import {
  DashboardPlanSchema,
  SAMPLE_PLAN,
} from "@/app/(lib)/plan-schema";

const DEFAULT_MODEL =
  process.env.HF_MODEL_ID ?? "meta-llama/Meta-Llama-3.1-8B-Instruct";

function hfModel() {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) return null;
  return createHfModel({ apiKey, model: DEFAULT_MODEL });
}

export async function POST(req: NextRequest) {
  const { prompt } = (await req.json().catch(() => ({}))) as {
    prompt?: string;
  };

  if (!prompt || !prompt.trim()) {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  const model = hfModel();
  if (!model) {
    return NextResponse.json({
      plan: SAMPLE_PLAN,
      cached: true,
      note: "HF_API_KEY missing — returning sample plan for development",
    });
  }

  try {
    const { object } = await generateObject({
      model,
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
