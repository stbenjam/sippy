import {
  alpha,
  Box,
  Breadcrumbs,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Link,
  TextField,
  InputAdornment,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ExpandMore as ExpandIcon,
  ChevronRight as CollapseIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSearchParams, Link as RouterLink } from "react-router-dom";
import {
  Status,
  statusLabel,
  isRegression,
  isTriaged,
} from "../../types/status";
import {
  useComponentTests,
  useAllTests,
  type ComponentTestRow,
  type ComponentTestsResponse,
  type TestVariantResult,
} from "../../hooks/useComponentTests";

// --- Status helpers ---

function statusColor(
  status: Status,
  theme: ReturnType<typeof useTheme>,
): string {
  if (status <= Status.ExtremeRegression) return theme.palette.error.dark;
  if (status <= Status.SignificantRegression) return theme.palette.error.main;
  if (isTriaged(status)) return theme.palette.warning.main;
  if (status === Status.MissingSample) return theme.palette.grey[500];
  if (status === Status.SignificantImprovement) return theme.palette.info.main;
  return theme.palette.success.main;
}

function statusBgColor(
  status: Status,
  theme: ReturnType<typeof useTheme>,
): string {
  if (status <= Status.ExtremeRegression)
    return alpha(theme.palette.error.dark, 0.08);
  if (status <= Status.SignificantRegression)
    return alpha(theme.palette.error.main, 0.06);
  if (isTriaged(status)) return alpha(theme.palette.warning.main, 0.06);
  if (status === Status.MissingSample)
    return alpha(theme.palette.grey[500], 0.06);
  if (status === Status.SignificantImprovement)
    return alpha(theme.palette.info.main, 0.04);
  return "transparent";
}

// --- Filter chips ---

type StatusFilter = "all" | "regressions" | "triaged" | "passing" | "improved";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "regressions", label: "Regressions" },
  { value: "triaged", label: "Triaged" },
  { value: "passing", label: "Passing" },
  { value: "improved", label: "Improved" },
];

function testMatchesFilter(test: ComponentTestRow, filter: StatusFilter): boolean {
  switch (filter) {
    case "regressions":
      return test.results.some(
        (r) => isRegression(r.status) && !isTriaged(r.status),
      );
    case "triaged":
      return test.results.some((r) => isTriaged(r.status));
    case "passing":
      return test.worst_status === Status.NotSignificant;
    case "improved":
      return test.worst_status === Status.SignificantImprovement;
    default:
      return true;
  }
}

// --- Main component ---

export default function TestsPage() {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const component = searchParams.get("component");
  const regressionsOnlyParam = searchParams.get("regressionsOnly") === "true";

  // Pre-select regressions filter when navigating with redOnly=true
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    regressionsOnlyParam ? "regressions" : "all",
  );

  // Build column variants from URL params
  const columnVariants = useMemo(() => {
    const variants: Record<string, string> = {};
    // Column group by dimensions are dynamic; we pick them from the URL
    // by checking all params that aren't well-known query params
    const knownParams = new Set([
      "component",
      "view",
      "baseRelease",
      "sampleRelease",
      "baseStartTime",
      "baseEndTime",
      "sampleStartTime",
      "sampleEndTime",
      "columnGroupBy",
      "dbGroupBy",
      "includeVariant",
      "compareVariant",
      "variantCrossCompare",
      "testCapabilities",
      "testLifecycles",
      "confidence",
      "pity",
      "minFail",
      "passRateNewTests",
      "passRateAllTests",
      "ignoreMissing",
      "ignoreDisruption",
      "flakeAsFailure",
      "includeMultiReleaseAnalysis",
      "forceRefresh",
      "capability",
      "testId",
      "regressionsOnly",
    ]);
    for (const [key, value] of searchParams.entries()) {
      if (!knownParams.has(key)) {
        variants[key] = value;
      }
    }
    return Object.keys(variants).length > 0 ? variants : undefined;
  }, [searchParams]);

  // When component is specified, use filtered hook; otherwise fetch all tests
  const componentResult = useComponentTests(component, columnVariants);
  const allResult = useAllTests();

  const data: ComponentTestsResponse | undefined = component
    ? componentResult.data
    : allResult.data;
  const isLoading = component ? componentResult.isLoading : allResult.isLoading;
  const error = component ? componentResult.error : allResult.error;

  // The dbGroupBy dimensions NOT shown in the grid columns — these vary within a cell
  const innerDimensions = useMemo(() => {
    if (!data) return [];
    return data.db_group_by.filter((d) => !data.column_group_by.includes(d));
  }, [data]);

  const filteredTests = useMemo(() => {
    if (!data?.tests) return [];
    let tests = data.tests;

    if (statusFilter !== "all") {
      tests = tests.filter((t) => testMatchesFilter(t, statusFilter));
    }

    if (search.trim()) {
      const lower = search.toLowerCase();
      tests = tests.filter(
        (t) =>
          t.test_name.toLowerCase().includes(lower) ||
          t.capability.toLowerCase().includes(lower) ||
          t.test_id.toLowerCase().includes(lower),
      );
    }

    return tests;
  }, [data, statusFilter, search]);

  const counts = useMemo(() => {
    const c = {
      regressions: 0,
      triaged: 0,
      passing: 0,
      improved: 0,
    };
    if (!data?.tests) return c;
    for (const t of data.tests) {
      if (testMatchesFilter(t, "regressions")) c.regressions++;
      if (testMatchesFilter(t, "triaged")) c.triaged++;
      if (testMatchesFilter(t, "passing")) c.passing++;
      if (testMatchesFilter(t, "improved")) c.improved++;
    }
    return c;
  }, [data]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredTests.length,
    getScrollElement: () => scrollRef.current,
    // Estimate: collapsed row ~36px
    estimateSize: useCallback(
      (index: number) => {
        const test = filteredTests[index];
        if (!test) return 36;
        const isExpanded = expandedTests.has(test.test_id);
        // ~36px header + ~32px per sub-row when expanded
        return isExpanded ? 36 + test.results.length * 32 : 36;
      },
      [filteredTests, expandedTests],
    ),
    overscan: 20,
  });

  const toggleExpanded = (testId: string) => {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress size={32} />
        <Typography color="text.secondary" variant="body2">
          {component ? `Loading tests for ${component}...` : "Loading all tests..."}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="error">
          Error loading tests: {(error as Error).message}
        </Typography>
      </Box>
    );
  }

  if (!data) return null;

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Breadcrumbs sx={{ mb: 0.5, fontSize: "0.8rem" }}>
          <Link
            component={RouterLink}
            to={`/component_readiness?${searchParams.toString()}`}
            underline="hover"
            color="text.secondary"
            sx={{ fontSize: "0.8rem" }}
          >
            Component Readiness
          </Link>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
            {component ?? "All Tests"}
          </Typography>
        </Breadcrumbs>

        <Box
          sx={{ display: "flex", alignItems: "center", gap: 2, mt: 0.5 }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontSize: "1.1rem" }}
          >
            {component ?? "All Tests"}
          </Typography>
          {columnVariants && (
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {Object.entries(columnVariants).map(([k, v]) => (
                  <Chip
                    key={k}
                    label={`${k}: ${v}`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.7rem",
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      "& .MuiChip-label": { px: 0.75 },
                    }}
                  />
                ))}
              </Box>
            )}
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontSize: "0.82rem" }}
          >
            {data.total_tests} tests
          </Typography>
        </Box>
      </Box>

      {/* Filters bar */}
      <Box
        sx={{
          px: 2.5,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 2,
          borderBottom: "1px solid",
          borderColor: alpha(theme.palette.divider, 0.08),
          flexShrink: 0,
        }}
      >
        <FilterIcon sx={{ fontSize: 16, color: "text.disabled" }} />
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {FILTER_OPTIONS.map((opt) => {
            const count =
              opt.value === "all"
                ? data.total_tests
                : (counts[opt.value as keyof typeof counts] ?? 0);
            const active = statusFilter === opt.value;
            return (
              <Chip
                key={opt.value}
                label={`${opt.label} (${count})`}
                size="small"
                onClick={() => setStatusFilter(opt.value)}
                sx={{
                  height: 24,
                  fontSize: "0.7rem",
                  fontWeight: active ? 700 : 400,
                  borderRadius: 1.5,
                  bgcolor: active
                    ? alpha(theme.palette.primary.main, 0.12)
                    : alpha(theme.palette.action.hover, 0.04),
                  color: active ? "primary.main" : "text.secondary",
                  border: active ? "1px solid" : "1px solid transparent",
                  borderColor: active
                    ? alpha(theme.palette.primary.main, 0.3)
                    : "transparent",
                  cursor: "pointer",
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            );
          })}
        </Box>

        <Box sx={{ flex: 1 }} />

        <TextField
          size="small"
          placeholder="Search tests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: 280,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              fontSize: "0.82rem",
            },
          }}
        />

        <Typography
          variant="caption"
          sx={{
            color: "text.disabled",
            fontSize: "0.72rem",
            whiteSpace: "nowrap",
          }}
        >
          {filteredTests.length} of {data.total_tests}
        </Typography>
      </Box>

      {/* Test list (virtualized) */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflow: "auto",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: alpha(theme.palette.text.disabled, 0.2),
            borderRadius: 3,
          },
        }}
      >
        {filteredTests.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2">
              No tests match the current filters.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const test = filteredTests[virtualRow.index];
              return (
                <Box
                  key={test.test_id}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TestRowItem
                    test={test}
                    expanded={expandedTests.has(test.test_id)}
                    onToggle={() => toggleExpanded(test.test_id)}
                    innerDimensions={innerDimensions}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}

// --- Shared regression variant detection ---

/**
 * Find variant key/value pairs that appear in ALL regressed results
 * but NONE of the non-regressed results — the true differentiators.
 */
function findSharedRegressionVariants(
  results: TestVariantResult[],
  innerDimensions: string[],
): Set<string> {
  const regressed = results.filter((r) => isRegression(r.status));
  const passing = results.filter((r) => !isRegression(r.status));
  if (regressed.length === 0 || passing.length === 0) return new Set();

  const shared = new Set<string>();
  for (const dim of innerDimensions) {
    const firstVal = regressed[0].variants[dim];
    if (!firstVal) continue;
    // Must be the same across ALL regressions
    if (!regressed.every((r) => r.variants[dim] === firstVal)) continue;
    // Must NOT appear in any passing result
    if (passing.some((r) => r.variants[dim] === firstVal)) continue;
    shared.add(`${dim}:${firstVal}`);
  }
  return shared;
}

// --- Test row ---

function TestRowItem({
  test,
  expanded,
  onToggle,
  innerDimensions,
}: {
  test: ComponentTestRow;
  expanded: boolean;
  onToggle: () => void;
  innerDimensions: string[];
}) {
  const theme = useTheme();
  const color = statusColor(test.worst_status, theme);
  const bgColor = statusBgColor(test.worst_status, theme);

  // Use worst result's stats for summary
  const worstResult =
    test.results.length > 0
      ? test.results.reduce((worst, r) =>
          r.status < worst.status ? r : worst,
        )
      : null;

  const sharedRegressionVariants = useMemo(
    () => findSharedRegressionVariants(test.results, innerDimensions),
    [test.results, innerDimensions],
  );

  if (!worstResult) return null;

  return (
    <Box>
      <Box
        onClick={onToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2.5,
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: alpha(theme.palette.divider, 0.06),
          bgcolor: bgColor,
          cursor: "pointer",
          "&:hover": { bgcolor: alpha(color, 0.06) },
          borderLeft: `3px solid ${color}`,
        }}
      >
        {/* Expand/collapse — always shown */}
        <Box sx={{ width: 24, flexShrink: 0 }}>
          <IconButton size="small" sx={{ p: 0 }}>
            {expanded ? (
              <ExpandIcon sx={{ fontSize: 18, color: "text.disabled" }} />
            ) : (
              <CollapseIcon sx={{ fontSize: 18, color: "text.disabled" }} />
            )}
          </IconButton>
        </Box>

        {/* Status badge */}
        <Chip
          label={statusLabel(test.worst_status)}
          size="small"
          sx={{
            height: 20,
            minWidth: 80,
            fontSize: "0.62rem",
            fontWeight: 700,
            borderRadius: 1,
            bgcolor: alpha(color, 0.12),
            color,
            "& .MuiChip-label": { px: 0.75 },
          }}
        />

        {/* Test name */}
        <Tooltip title={test.test_name} placement="top-start">
          <Typography
            sx={{
              flex: 1,
              fontSize: "0.78rem",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {test.test_name}
          </Typography>
        </Tooltip>

        {/* Capability */}
        <Chip
          label={test.capability}
          size="small"
          sx={{
            height: 20,
            fontSize: "0.62rem",
            borderRadius: 1,
            bgcolor: alpha(theme.palette.action.hover, 0.08),
            flexShrink: 0,
            "& .MuiChip-label": { px: 0.75 },
          }}
        />

        {/* Result count */}
        <Tooltip
          title={`${test.results.length} variant combination${test.results.length > 1 ? "s" : ""} (${innerDimensions.join(", ")})`}
        >
          <Chip
            label={`${test.results.length} result${test.results.length > 1 ? "s" : ""}`}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.62rem",
              borderRadius: 1,
              bgcolor: alpha(theme.palette.info.main, 0.08),
              color: "info.main",
              flexShrink: 0,
              "& .MuiChip-label": { px: 0.75 },
            }}
          />
        </Tooltip>

        {/* Pass rates from worst result */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexShrink: 0,
            minWidth: 180,
            justifyContent: "flex-end",
          }}
        >
          <PassRateCompact
            label="Sample"
            rate={worstResult.sample_stats.success_rate * 100}
            count={
              worstResult.sample_stats.success_count +
              worstResult.sample_stats.failure_count +
              worstResult.sample_stats.flake_count
            }
          />
          <Typography
            sx={{ fontSize: "0.65rem", color: "text.disabled", mx: 0.25 }}
          >
            →
          </Typography>
          {worstResult.base_stats ? (
            <PassRateCompact
              label="Base"
              rate={worstResult.base_stats.success_rate * 100}
              count={
                worstResult.base_stats.success_count +
                worstResult.base_stats.failure_count +
                worstResult.base_stats.flake_count
              }
            />
          ) : (
            <Typography
              sx={{ fontSize: "0.65rem", color: "text.disabled" }}
            >
              N/A
            </Typography>
          )}
        </Box>
      </Box>

      {/* Expanded: individual dbGroupBy results */}
      {expanded &&
        test.results
          .slice()
          .sort((a, b) => a.status - b.status)
          .map((result, i) => (
            <VariantResultRow
              key={i}
              result={result}
              innerDimensions={innerDimensions}
              sharedRegressionVariants={sharedRegressionVariants}
            />
          ))}
    </Box>
  );
}

// --- Variant result sub-row (one per dbGroupBy combination) ---

function VariantResultRow({
  result,
  innerDimensions,
  sharedRegressionVariants,
}: {
  result: TestVariantResult;
  innerDimensions: string[];
  sharedRegressionVariants: Set<string>;
}) {
  const theme = useTheme();
  const color = statusColor(result.status, theme);
  const isResultRegressed = isRegression(result.status);

  const sampleTotal =
    result.sample_stats.success_count +
    result.sample_stats.failure_count +
    result.sample_stats.flake_count;
  const baseTotal = result.base_stats
    ? result.base_stats.success_count +
      result.base_stats.failure_count +
      result.base_stats.flake_count
    : 0;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        pl: 7.5,
        pr: 2.5,
        py: 0.5,
        borderBottom: "1px solid",
        borderColor: alpha(theme.palette.divider, 0.04),
        bgcolor: alpha(theme.palette.action.hover, 0.02),
        borderLeft: `3px solid ${alpha(color, 0.4)}`,
      }}
    >
      {/* Status */}
      <Chip
        label={statusLabel(result.status)}
        size="small"
        sx={{
          height: 18,
          minWidth: 80,
          fontSize: "0.58rem",
          fontWeight: 600,
          borderRadius: 1,
          bgcolor: alpha(color, 0.08),
          color,
          "& .MuiChip-label": { px: 0.5 },
        }}
      />

      {/* Show only the inner dimensions that vary within the cell */}
      <Box sx={{ display: "flex", gap: 0.5, flex: 1, flexWrap: "wrap" }}>
        {innerDimensions.map((dim) => {
          const val = result.variants[dim];
          if (!val) return null;
          const isShared =
            isResultRegressed &&
            sharedRegressionVariants.has(`${dim}:${val}`);
          return (
            <Chip
              key={dim}
              label={`${dim}: ${val}`}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.58rem",
                borderRadius: 1,
                bgcolor: isShared
                  ? alpha(theme.palette.error.main, 0.1)
                  : alpha(theme.palette.action.hover, 0.06),
                border: isShared ? "1px solid" : "1px solid transparent",
                borderColor: isShared
                  ? alpha(theme.palette.error.main, 0.4)
                  : "transparent",
                fontWeight: isShared ? 700 : 400,
                "& .MuiChip-label": { px: 0.5 },
              }}
            />
          );
        })}
      </Box>

      {/* Pass rates */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
          minWidth: 180,
          justifyContent: "flex-end",
        }}
      >
        <PassRateCompact
          label="Sample"
          rate={result.sample_stats.success_rate * 100}
          count={sampleTotal}
        />
        <Typography
          sx={{ fontSize: "0.6rem", color: "text.disabled", mx: 0.25 }}
        >
          →
        </Typography>
        {result.base_stats ? (
          <PassRateCompact
            label="Base"
            rate={result.base_stats.success_rate * 100}
            count={baseTotal}
          />
        ) : (
          <Typography sx={{ fontSize: "0.6rem", color: "text.disabled" }}>
            N/A
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// --- Compact pass rate display ---

function PassRateCompact({
  label,
  rate,
  count,
}: {
  label: string;
  rate: number;
  count: number;
}) {
  const theme = useTheme();
  const color =
    rate >= 95
      ? theme.palette.success.main
      : rate >= 85
        ? theme.palette.success.light
        : rate >= 75
          ? theme.palette.warning.main
          : theme.palette.error.main;

  return (
    <Tooltip title={`${label}: ${rate.toFixed(2)}% (${count} runs)`}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <LinearProgress
          variant="determinate"
          value={rate}
          sx={{
            width: 30,
            height: 4,
            borderRadius: 2,
            bgcolor: alpha(color, 0.12),
            "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 2 },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.68rem",
            fontWeight: 600,
            color,
            fontVariantNumeric: "tabular-nums",
            minWidth: 36,
            textAlign: "right",
          }}
        >
          {rate.toFixed(1)}%
        </Typography>
      </Box>
    </Tooltip>
  );
}
