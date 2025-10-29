"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadDatasets, parsePlan } from "@/lib/datasets";
import { clearPersisted, loadPersisted, persist } from "@/lib/storage";
import type { DashboardDatasetResult, DashboardPlan } from "@/lib/plan";

export type PlanResponse = {
  plan: unknown;
  provider: string;
  presets?: string[];
  message?: string;
};

export const usePlanWorkspace = (defaultPresets: readonly string[]) => {
  const initialCache = useMemo(() => loadPersisted(), []);
  const [plan, setPlan] = useState<DashboardPlan | null>(initialCache?.plan ?? null);
  const [provider, setProvider] = useState<string>(initialCache ? "cache" : "sample");
  const [presets, setPresets] = useState<string[]>(() => [...defaultPresets]);
  const [message, setMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isGenerating, setGenerating] = useState(false);
  const [datasets, setDatasets] = useState<Record<string, DashboardDatasetResult>>(
    initialCache?.datasets ?? {},
  );
  const [notes, setNotes] = useState<string[]>([]);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [isLoadingDatasets, setLoadingDatasets] = useState(false);

  useEffect(() => {
    if (!plan) {
      setDatasets({});
      setNotes([]);
      setDatasetError(null);
      setLoadingDatasets(false);
      return;
    }

    let cancelled = false;
    setLoadingDatasets(true);
    setDatasetError(null);

    loadDatasets(plan)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setDatasets(result.datasets);
        setNotes(result.notes);
        persist({ plan, datasets: result.datasets });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setDatasetError(error instanceof Error ? error.message : "Failed to load datasets");
        setDatasets({});
        setNotes([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDatasets(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [plan]);

  const ready = useMemo(
    () => Boolean(plan) && Object.keys(datasets).length === (plan?.datasets.length ?? 0),
    [datasets, plan],
  );

  const generate = useCallback(
    async (prompt: string) => {
      setApiError(null);
      setMessage(null);
      setGenerating(true);
      try {
        const response = await fetch("/api/plan", {
          method: "POST",
          body: JSON.stringify({ prompt }),
          headers: { "Content-Type": "application/json" },
        });

        const json = (await response.json()) as PlanResponse;
        setProvider(json.provider);
        setPresets(json.presets ? [...json.presets] : [...defaultPresets]);

        if (!response.ok) {
          setMessage(json.message ?? "Unable to generate plan");
          setDatasets({});
          setNotes([]);
          return;
        }

        const parsedPlan = parsePlan(json.plan);
        setPlan({ ...parsedPlan });
        setDatasets({});
        setNotes([]);

        if (json.message) {
          setMessage(json.message);
        }
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Failed to reach planning API");
      } finally {
        setGenerating(false);
      }
    },
    [defaultPresets],
  );

  const rebuild = useCallback(() => {
    setPlan((current) => {
      if (!current) {
        return current;
      }
      const clonedLayout = current.layout.map((item) => ({ ...item }));
      return {
        ...current,
        layout: clonedLayout,
      };
    });
  }, []);

  const reset = useCallback(() => {
    clearPersisted();
    setPlan(null);
    setProvider("sample");
    setMessage(null);
    setApiError(null);
    setPresets([...defaultPresets]);
    setDatasets({});
    setNotes([]);
    setDatasetError(null);
    setLoadingDatasets(false);
  }, [defaultPresets]);

  return {
    apiError,
    datasetError,
    datasets,
    generate,
    isFetching: isLoadingDatasets,
    isGenerating,
    message,
    notes,
    plan,
    presets,
    provider,
    ready,
    rebuild,
    reset,
  };
};
