import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type {
  ColumnIdentification,
  ComponentReport,
  ReportRow,
} from "../../types";
import { isRegression, Status, statusLabel } from "../../types";
import { useComponentReadinessStore } from "../../store/store";
import ColumnHeaders from "./ColumnHeaders";
import GridCell from "./GridCell";
import GridToolbar from "./GridToolbar";
import StatusIcon from "../shared/StatusIcon";
import { useCallback, useMemo, useRef } from "react";

const COMPONENT_COL_WIDTH = 260;

interface GridViewProps {
  report?: ComponentReport;
  onCellClick?: (component: string, column: ColumnIdentification) => void;
  onComponentClick?: (component: string) => void;
  searchFilter?: string;
  redOnlyFilter?: boolean;
  onViewJobs?: () => void;
  onViewRegressions?: () => void;
}

function getColumns(report: ComponentReport): ColumnIdentification[] {
  if (!report.rows?.length) return [];
  return report.rows[0].columns.map((col) => ({ variants: col.variants }));
}

function hasRegression(row: ReportRow): boolean {
  return row.columns.some((col) => isRegression(col.status));
}

export default function GridView({
  report,
  onCellClick,
  onComponentClick,
  searchFilter: externalSearch,
  redOnlyFilter: externalRedOnly,
  onViewJobs,
  onViewRegressions,
}: GridViewProps) {
  const setRedOnlyFilter = useComponentReadinessStore(
    (s) => s.setRedOnlyFilter,
  );
  const setSearchFilter = useComponentReadinessStore((s) => s.setSearchFilter);
  const storeRedOnly = useComponentReadinessStore((s) => s.redOnlyFilter);
  const storeSearch = useComponentReadinessStore((s) => s.searchFilter);

  const tableRef = useRef<HTMLTableElement>(null);
  const prevColRef = useRef<number | null>(null);

  const search = externalSearch ?? storeSearch;
  const redOnly = externalRedOnly ?? storeRedOnly;

  // Count unresolved regressions from the report data (same source as the grid cells).
  // "Unresolved" = status <= -200, i.e. still actively regressing whether or not
  // someone has triaged it. Only FixedRegression (-150) is excluded.
  const regressionCount = useMemo(() => {
    if (!report?.rows) return undefined;
    let count = 0;
    for (const row of report.rows) {
      for (const col of row.columns) {
        if (col.regressed_tests) {
          for (const test of col.regressed_tests) {
            if (test.status <= -200) {
              count++;
            }
          }
        }
      }
    }
    return count;
  }, [report]);

  const columns = useMemo(() => {
    if (!report) return [];
    return getColumns(report);
  }, [report]);

  const filteredRows = useMemo(() => {
    if (!report?.rows) return [];

    let rows = [...report.rows].sort((a, b) =>
      a.component.localeCompare(b.component),
    );

    if (search) {
      try {
        const regex = new RegExp(search, "i");
        rows = rows.filter((row) => regex.test(row.component));
      } catch {
        const lower = search.toLowerCase();
        rows = rows.filter((row) =>
          row.component.toLowerCase().includes(lower),
        );
      }
    }

    if (redOnly) {
      rows = rows.filter(hasRegression);
    }

    return rows;
  }, [report, search, redOnly]);

  // Column highlighting via direct DOM manipulation for performance
  const handleCellEnter = useCallback((colIndex: number) => {
    if (prevColRef.current === colIndex) return;
    const table = tableRef.current;
    if (!table) return;

    if (prevColRef.current !== null) {
      const prev = table.querySelectorAll(`[data-col="${prevColRef.current}"]`);
      prev.forEach((el) => el.classList.remove("col-highlight"));
    }

    const cells = table.querySelectorAll(`[data-col="${colIndex}"]`);
    cells.forEach((el) => el.classList.add("col-highlight"));
    prevColRef.current = colIndex;
  }, []);

  const handleCellLeave = useCallback(() => {
    const table = tableRef.current;
    if (!table || prevColRef.current === null) return;
    const cells = table.querySelectorAll(`[data-col="${prevColRef.current}"]`);
    cells.forEach((el) => el.classList.remove("col-highlight"));
    prevColRef.current = null;
  }, []);

  if (!report) {
    return (
      <Box
        sx={{
          p: 6,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography color="text.secondary" variant="body1">
          No report data available.
        </Typography>
        <Typography color="text.disabled" variant="caption">
          Select a view and release to generate a report.
        </Typography>
      </Box>
    );
  }

  const legendStatuses: Status[] = [
    Status.ExtremeRegression,
    Status.SignificantRegression,
    Status.FailedFixedRegression,
    Status.ExtremeTriagedRegression,
    Status.SignificantTriagedRegression,
    Status.FixedRegression,
    Status.NotSignificant,
    Status.SignificantImprovement,
    Status.MissingSample,
    Status.MissingBasis,
    Status.MissingBasisAndSample,
  ];

  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        gap: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          borderRadius: 1,
          overflow: "hidden",
          border: 1,
          borderColor: "divider",
        }}
      >
      <GridToolbar
        searchRowRegex={search}
        onSearchRowChange={setSearchFilter}
        redOnlyChecked={redOnly}
        onRedOnlyChange={setRedOnlyFilter}
        totalRows={report.rows?.length}
        visibleRows={filteredRows.length}
        regressionCount={regressionCount}
        onViewJobs={onViewJobs}
        onViewRegressions={onViewRegressions}
      />

      <TableContainer
        sx={{
          flex: 1,
          minHeight: 0,
          // Custom scrollbar styling
          "&::-webkit-scrollbar": {
            width: 8,
            height: 8,
          },
          "&::-webkit-scrollbar-track": {
            bgcolor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: (t) => alpha(t.palette.text.primary, 0.15),
            borderRadius: 4,
            "&:hover": {
              bgcolor: (t) => alpha(t.palette.text.primary, 0.25),
            },
          },
        }}
      >
        <Table
          ref={tableRef}
          size="small"
          stickyHeader
          sx={{
            width: "auto",
            mx: "auto",
            borderCollapse: "separate",
            borderSpacing: 0,
            // Row hover via pure CSS for performance
            "& tbody tr": {
              transition: "background-color 0.1s ease",
            },
            "& tbody tr:hover > td": {
              bgcolor: (t) =>
                t.palette.mode === "dark"
                  ? alpha(t.palette.primary.main, 0.06)
                  : alpha(t.palette.primary.main, 0.03),
            },
            "& tbody tr:hover > td:first-of-type": {
              bgcolor: (t) =>
                t.palette.mode === "dark"
                  ? t.palette.grey[800]
                  : t.palette.grey[100],
            },
          }}
        >
          <ColumnHeaders
            columns={columns}
            componentColWidth={COMPONENT_COL_WIDTH}
          />
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.component}>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    bgcolor: (t) =>
                      t.palette.mode === "dark"
                        ? t.palette.grey[900]
                        : t.palette.grey[50],
                    width: COMPONENT_COL_WIDTH,
                    minWidth: COMPONENT_COL_WIDTH,
                    maxWidth: COMPONENT_COL_WIDTH,
                    fontSize: "0.75rem",
                    py: 1,
                    px: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    borderBottom: 1,
                    borderBottomColor: (t) =>
                      t.palette.mode === "dark"
                        ? alpha(t.palette.divider, 0.4)
                        : t.palette.grey[100],
                    borderRight: 1,
                    borderRightColor: "divider",
                    color: "text.primary",
                    letterSpacing: "-0.01em",
                    cursor: onComponentClick ? "pointer" : "default",
                    "&:hover": onComponentClick
                      ? { bgcolor: "action.hover" }
                      : undefined,
                    ...(hasRegression(row) && {
                      borderLeft: 3,
                      borderLeftColor: "error.main",
                    }),
                  }}
                  title={row.component}
                  onClick={
                    onComponentClick
                      ? () => onComponentClick(row.component)
                      : undefined
                  }
                >
                  {row.component}
                </TableCell>
                {row.columns.map((col, ci) => (
                  <GridCell
                    key={ci}
                    column={col}
                    colIndex={ci}
                    dimmed={redOnly && !isRegression(col.status)}
                    onMouseEnter={handleCellEnter}
                    onMouseLeave={handleCellLeave}
                    onClick={
                      onCellClick
                        ? () => onCellClick(row.component, columns[ci])
                        : undefined
                    }
                  />
                ))}
              </TableRow>
            ))}
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  sx={{
                    textAlign: "center",
                    py: 6,
                    color: "text.disabled",
                    fontSize: "0.875rem",
                  }}
                >
                  {search || redOnly
                    ? "No components match the current filters."
                    : "No data in this report."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>

      <Paper
        elevation={0}
        sx={{
          width: 160,
          flexShrink: 0,
          alignSelf: "flex-start",
          p: 2,
          mt: 0,
          borderRadius: 1,
          border: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "text.secondary",
            mb: 0.5,
          }}
        >
          Legend
        </Typography>
        {legendStatuses.map((status) => (
          <Box
            key={status}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <StatusIcon status={status} />
            <Typography
              variant="body2"
              sx={{
                fontSize: "0.7rem",
                color: "text.secondary",
                lineHeight: 1.3,
              }}
            >
              {statusLabel(status)}
            </Typography>
          </Box>
        ))}
        {report.generated_at && (
          <Typography
            variant="caption"
            sx={{
              color: "text.disabled",
              fontSize: "0.65rem",
              mt: 1.5,
              pt: 1.5,
              borderTop: 1,
              borderColor: "divider",
              lineHeight: 1.4,
            }}
          >
            Generated{" "}
            {new Date(report.generated_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
