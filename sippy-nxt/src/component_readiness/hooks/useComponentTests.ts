import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
  db_group_by: string[];
  column_group_by: string[];
  total_tests: number;
  generated_at?: string;
  tests: ComponentTestRow[];
}

async function fetchAllTests(
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
 * Fetches ALL tests for the current view (cached once per view params).
 * Returns the full dataset for client-side filtering.
 */
export function useAllTests() {
  const state = useComponentReadinessStore();
  const baseParams = buildReportParams(state);
  const paramString = baseParams.toString();

  return useQuery<ComponentTestsResponse>({
    queryKey: ["component-readiness", "all-tests", paramString],
    queryFn: () => fetchAllTests(new URLSearchParams(paramString)),
    enabled: !!paramString,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches all tests for the view, then filters client-side by component
 * and optional column variant values. No additional API calls needed.
 */
export function useComponentTests(
  component: string | null,
  columnVariants?: Record<string, string>,
) {
  const { data: allData, isLoading, error } = useAllTests();

  const filtered = useMemo(() => {
    if (!allData || !component) return undefined;

    const matchingTests = allData.tests.filter((test) => {
      if (test.component !== component) return false;
      return true;
    });

    // If column variants are specified, filter each test's results
    // to only those matching the variant constraints
    const tests = columnVariants
      ? matchingTests
          .map((test) => {
            const filteredResults = test.results.filter((r) =>
              Object.entries(columnVariants).every(
                ([k, v]) => r.variants[k] === v,
              ),
            );
            if (filteredResults.length === 0) return null;

            const worstStatus = filteredResults.reduce(
              (worst, r) => (r.status < worst ? r.status : worst),
              filteredResults[0].status,
            );

            return { ...test, results: filteredResults, worst_status: worstStatus };
          })
          .filter((t): t is ComponentTestRow => t !== null)
      : matchingTests;

    // Sort: worst status first, then by name
    const sorted = [...tests].sort((a, b) => {
      if (a.worst_status !== b.worst_status) return a.worst_status - b.worst_status;
      return a.test_name.localeCompare(b.test_name);
    });

    return {
      db_group_by: allData.db_group_by,
      column_group_by: allData.column_group_by,
      total_tests: sorted.length,
      generated_at: allData.generated_at,
      tests: sorted,
    } satisfies ComponentTestsResponse;
  }, [allData, component, columnVariants]);

  return { data: filtered, isLoading, error };
}
