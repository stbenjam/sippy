import { useQuery } from "@tanstack/react-query";
import type { ViewJobsResponse } from "../types/jobs";
import { useComponentReadinessStore } from "../store/store";
import { buildReportParams } from "./useReport";

const API_BASE = import.meta.env.VITE_API_URL || "";

async function fetchViewJobs(
  params: URLSearchParams,
): Promise<ViewJobsResponse> {
  const res = await fetch(
    `${API_BASE}/api/component_readiness/jobs?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to fetch view jobs: ${res.status} ${res.statusText}`,
    );
  }
  return res.json();
}

export function useViewJobs() {
  const state = useComponentReadinessStore();
  const params = buildReportParams(state);
  const paramString = params.toString();

  return useQuery<ViewJobsResponse>({
    queryKey: ["component-readiness", "view-jobs", paramString],
    queryFn: () => fetchViewJobs(new URLSearchParams(paramString)),
    enabled: !!paramString,
    staleTime: 5 * 60 * 1000,
  });
}
