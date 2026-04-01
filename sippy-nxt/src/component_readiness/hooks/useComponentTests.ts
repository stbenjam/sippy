import { useQuery } from "@tanstack/react-query";
import { buildReportParams } from "./useReport";
import { useComponentReadinessStore } from "../store/store";
import type { Status } from "../types/status";

const API_BASE = import.meta.env.VITE_API_URL || "";

export interface TestVariantResult {
  variants: Record<string, string>;
  status: Status;
  sample_stats: {
    release: string;
    success_count: number;
    failure_count: number;
    flake_count: number;
    success_rate: number;
  };
  base_stats?: {
    release: string;
    success_count: number;
    failure_count: number;
    flake_count: number;
    success_rate: number;
  };
  fisher_exact?: number;
}

export interface ComponentTestRow {
  test_id: string;
  test_name: string;
  test_suite: string;
  component: string;
  capability: string;
  worst_status: Status;
  results: TestVariantResult[];
}

export interface ComponentTestsResponse {
  component: string;
  column_variants?: Record<string, string>;
  db_group_by: string[];
  column_group_by: string[];
  total_tests: number;
  generated_at?: string;
  tests: ComponentTestRow[];
}

async function fetchComponentTests(
  params: URLSearchParams,
): Promise<ComponentTestsResponse> {
  const res = await fetch(
    `${API_BASE}/api/component_readiness/tests?${params.toString()}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to fetch component tests: ${res.status} ${res.statusText}`,
    );
  }
  return res.json();
}

/**
 * Fetches all tests for a specific component, optionally filtered by column variant values.
 * @param component - The component name (required)
 * @param columnVariants - Optional variant values from the clicked cell (e.g., {Platform: "aws"})
 */
export function useComponentTests(
  component: string | null,
  columnVariants?: Record<string, string>,
) {
  const state = useComponentReadinessStore();
  const baseParams = buildReportParams(state);

  // Add component and variant filters to the base report params
  if (component) {
    baseParams.set("component", component);
  }
  if (columnVariants) {
    for (const [k, v] of Object.entries(columnVariants)) {
      baseParams.set(k, v);
    }
  }

  const paramString = baseParams.toString();

  return useQuery<ComponentTestsResponse>({
    queryKey: ["component-readiness", "tests", paramString],
    queryFn: () => fetchComponentTests(new URLSearchParams(paramString)),
    enabled: !!component,
    staleTime: 5 * 60 * 1000,
  });
}
