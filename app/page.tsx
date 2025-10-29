"use client";

import { useCallback } from "react";
import { PLAN_SAMPLE_PROMPTS } from "@/constants/plan";
import { DashboardHeader } from "@/components/DashboardHeader";
import { PlanViewer } from "@/components/PlanViewer";
import { PromptForm } from "@/components/PromptForm";
import { StatusBadges } from "@/components/StatusBadges";
import { useRole } from "@/components/RoleToggle";
import { usePlanWorkspace } from "@/hooks/usePlanWorkspace";

const headline = "SelectQuote Generative Dashboard";

export default function Page() {
  const [role, setRole] = useRole();
  const {
    apiError,
    datasetError,
    datasets,
    generate,
    isFetching,
    isGenerating,
    message,
    notes,
    plan,
    presets,
    provider,
    ready,
    rebuild,
    reset,
  } = usePlanWorkspace(PLAN_SAMPLE_PROMPTS);

  const handleSubmit = useCallback((prompt: string) => generate(prompt), [generate]);

  const handleNoopSubmit = useCallback(() => Promise.resolve(), []);

  const errorMessages = [apiError, datasetError].filter((value): value is string => Boolean(value));

  return (
    <div className="flex min-h-screen flex-col gap-8 bg-slate-950 p-6 text-slate-100">
      <DashboardHeader
        headline={headline}
        onClear={reset}
        onRoleChange={setRole}
        role={role}
      />

      <PromptForm
        loading={isGenerating || role === "viewer"}
        initialPrompt={presets[0]}
        presets={presets}
        onSubmit={role === "viewer" ? handleNoopSubmit : handleSubmit}
        onRebuild={plan ? rebuild : undefined}
      />

      {role === "viewer" ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Viewer mode is read-only. Switch to Builder to generate a new plan.
        </p>
      ) : null}

      <StatusBadges
        provider={provider}
        notes={notes}
        message={message}
        errors={errorMessages}
      />

      <PlanViewer
        plan={plan}
        datasets={datasets}
        isFetching={isFetching}
        ready={ready}
      />
    </div>
  );
}
