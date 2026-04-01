import {
  Box,
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
import { isRegression } from "../../types";
import { useComponentReadinessStore } from "../../store/store";
import ColumnHeaders from "./ColumnHeaders";
import GridCell from "./GridCell";
import GridToolbar from "./GridToolbar";
import { useCallback, useMemo, useRef } from "react";

const COMPONENT_COL_WIDTH = 260;

interface GridViewProps {
  report?: ComponentReport;
  onCellClick?: (component: string, column: ColumnIdentification) => void;
  searchFilter?: string;
  redOnlyFilter?: boolean;
  onViewJobs?: () => void;
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
  searchFilter: externalSearch,
  redOnlyFilter: externalRedOnly,
  onViewJobs,
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

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
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
        generatedAt={report.generated_at}
        totalRows={report.rows?.length}
        visibleRows={filteredRows.length}
        onViewJobs={onViewJobs}
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
                    // Subtle indicator for rows with regressions
                    ...(hasRegression(row) && {
                      borderLeft: 3,
                      borderLeftColor: "error.main",
                    }),
                  }}
                  title={row.component}
                >
                  {row.component}
                </TableCell>
                {row.columns.map((col, ci) => (
                  <GridCell
                    key={ci}
                    column={col}
                    colIndex={ci}
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
  );
}
