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
  const attempts = buildJsonRepairAttempts(jsonSlice);
  return parseJsonWithRepairs(attempts);
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

function buildJsonRepairAttempts(source: string): string[] {
  const transformations: Array<(value: string) => string> = [
    (value) => value,
    (value) => value.replace(/\r\n?/g, "\n"),
    normalizeSmartQuotes,
    removeTrailingCommas,
    convertSingleQuotes,
  ];

  const finalState = transformations.reduce(
    (state, transform) => {
      const nextValue = transform(state.current);
      const normalized = nextValue.trim();

      if (!normalized || state.attempts.includes(normalized)) {
        return { attempts: state.attempts, current: nextValue };
      }

      return {
        attempts: [...state.attempts, normalized],
        current: nextValue,
      };
    },
    { attempts: [] as string[], current: source }
  );

  return finalState.attempts;
}

function normalizeSmartQuotes(value: string): string {
  return value.replace(/[“”]/g, "\"").replace(/[‘’‚‛]/g, "'");
}

function removeTrailingCommas(value: string): string {
  const characters = Array.from(value);
  type TrailingCommaState = {
    result: string;
    inString: boolean;
    delimiter: '"' | "'" | null;
    backslashRun: number;
  };

  const finalState = characters.reduce<TrailingCommaState>(
    (state, char, index) => {
      if (!char) {
        return state;
      }

      const isQuote = char === '"' || char === "'";
      const isEscapedQuote = isQuote && state.inString && state.backslashRun % 2 === 1;

      const toggled = !isQuote || isEscapedQuote
        ? { inString: state.inString, delimiter: state.delimiter }
        : state.inString
          ? state.delimiter === char
            ? { inString: false, delimiter: null }
            : { inString: state.inString, delimiter: state.delimiter }
          : { inString: true, delimiter: char as '"' | "'" };

      const nextRelevant =
        !toggled.inString && char === ","
          ? characters.slice(index + 1).find((nextChar) => !/\s/.test(nextChar))
          : undefined;

      const shouldSkip =
        !toggled.inString &&
        char === "," &&
        (nextRelevant === "}" || nextRelevant === "]");

      const appendedResult = shouldSkip ? state.result : `${state.result}${char}`;

      const nextBackslashRun =
        toggled.inString && char === "\\" ? state.backslashRun + 1 : 0;

      return {
        result: appendedResult,
        inString: toggled.inString,
        delimiter: toggled.delimiter,
        backslashRun: nextBackslashRun,
      };
    },
    { result: "", inString: false, delimiter: null, backslashRun: 0 }
  );

  return finalState.result;
}

function convertSingleQuotes(value: string): string {
  return value
    .replace(/([[{,]\s*)'([^'\\]*(?:\\.[^'\\]*)*)'(\s*:)/g, (_match, prefix, content, suffix) => {
      return `${prefix}"${content}"${suffix}`;
    })
    .replace(/(:\s*)'([^'\\]*(?:\\.[^'\\]*)*)'(\s*(?:,|}|\]))/g, (_match, prefix, content, suffix) => {
      return `${prefix}"${content}"${suffix}`;
    });
}

function parseJsonWithRepairs(
  attempts: string[],
  lastError: unknown = null
): unknown {
  if (!attempts.length) {
    const reason =
      lastError instanceof Error ? lastError.message : "Failed to parse JSON";
    throw new Error(`Failed to parse JSON from LLM response: ${reason}`);
  }

  const [attempt, ...remaining] = attempts;

  try {
    return JSON.parse(attempt);
  } catch (error) {
    return parseJsonWithRepairs(remaining, error);
  }
}
