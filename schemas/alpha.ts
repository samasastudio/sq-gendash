const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export type AlphaRequestBody = {
  dataset: unknown;
};

export const parseAlphaRequestBody = (
  input: unknown,
): AlphaRequestBody | null => {
  if (!isRecord(input)) {
    return null;
  }

  if (!("dataset" in input)) {
    return null;
  }

  return { dataset: input.dataset };
};
