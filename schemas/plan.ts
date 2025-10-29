const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export type PlanRequestBody = {
  prompt: string;
};

export const parsePlanRequestBody = (
  input: unknown,
): PlanRequestBody | null => {
  if (!isRecord(input)) {
    return null;
  }

  const promptValue = typeof input.prompt === "string" ? input.prompt.trim() : "";

  if (promptValue === "") {
    return null;
  }

  return { prompt: promptValue };
};
