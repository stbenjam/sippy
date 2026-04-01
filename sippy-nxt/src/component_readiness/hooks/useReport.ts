import { useQuery } from "@tanstack/react-query";
import type { ComponentReport } from "../types";
import type { ComponentReadinessState } from "../store/store";

const API_BASE = import.meta.env.VITE_API_URL || "";

export function buildReportParams(
  state: ComponentReadinessState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.view && !state.hasUnsavedChanges()) {
    params.set("view", state.view);
    return params;
  }

  if (state.baseRelease) {
    params.set("baseRelease", state.baseRelease.release);
    if (state.baseRelease.relative_start) {
      params.set("baseStartTime", state.baseRelease.relative_start);
    } else if (state.baseRelease.start) {
      params.set("baseStartTime", state.baseRelease.start);
    }
    if (state.baseRelease.relative_end) {
      params.set("baseEndTime", state.baseRelease.relative_end);
    } else if (state.baseRelease.end) {
      params.set("baseEndTime", state.baseRelease.end);
    }
  }

  if (state.sampleRelease) {
    params.set("sampleRelease", state.sampleRelease.release);
    if (state.sampleRelease.relative_start) {
      params.set("sampleStartTime", state.sampleRelease.relative_start);
    } else if (state.sampleRelease.start) {
      params.set("sampleStartTime", state.sampleRelease.start);
    }
    if (state.sampleRelease.relative_end) {
      params.set("sampleEndTime", state.sampleRelease.relative_end);
    } else if (state.sampleRelease.end) {
      params.set("sampleEndTime", state.sampleRelease.end);
    }
  }

  if (state.columnGroupBy.length > 0) {
    params.set("columnGroupBy", state.columnGroupBy.join(","));
  }

  if (state.dbGroupBy.length > 0) {
    params.set("dbGroupBy", state.dbGroupBy.join(","));
  }

  for (const [group, values] of Object.entries(state.includeVariants)) {
    for (const value of values) {
      params.append("includeVariant", `${group}:${value}`);
    }
  }

  for (const [group, values] of Object.entries(state.compareVariants)) {
    for (const value of values) {
      params.append("compareVariant", `${group}:${value}`);
    }
  }

  for (const v of state.variantCrossCompare) {
    params.append("variantCrossCompare", v);
  }

  for (const cap of state.capabilities) {
    params.append("testCapabilities", cap);
  }

  for (const lc of state.lifecycles) {
    params.append("testLifecycles", lc);
  }

  params.set("confidence", String(state.confidence));
  params.set("pity", String(state.pityFactor));
  params.set("minFail", String(state.minimumFailure));
  params.set("passRateNewTests", String(state.passRateRequiredNewTests));
  params.set("passRateAllTests", String(state.passRateRequiredAllTests));
  params.set("ignoreMissing", String(state.ignoreMissing));
  params.set("ignoreDisruption", String(state.ignoreDisruption));
  params.set("flakeAsFailure", String(state.flakeAsFailure));
  params.set(
    "includeMultiReleaseAnalysis",
    String(state.includeMultiReleaseAnalysis),
  );

  return params;
}

async function fetchReport(params: URLSearchParams): Promise<ComponentReport> {
  const res = await fetch(
    `${API_BASE}/api/component_readiness?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch report: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function useReport(committedParams: string | null) {
  return useQuery<ComponentReport>({
    queryKey: ["component-readiness", "report", committedParams],
    queryFn: () => fetchReport(new URLSearchParams(committedParams!)),
    enabled: !!committedParams,
  });
}
