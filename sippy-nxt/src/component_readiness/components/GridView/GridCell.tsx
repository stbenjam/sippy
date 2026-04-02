import type { ReportColumn } from "../../types";
import { isRegression } from "../../types";
import { TableCell } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback } from "react";
import StatusIcon from "../shared/StatusIcon";

interface GridCellProps {
  column: ReportColumn;
  colIndex: number;
  dimmed?: boolean;
  onClick?: () => void;
  onMouseEnter?: (colIndex: number) => void;
  onMouseLeave?: () => void;
}

export default function GridCell({
  column,
  colIndex,
  dimmed,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: GridCellProps) {
  const handleEnter = useCallback(() => {
    onMouseEnter?.(colIndex);
  }, [onMouseEnter, colIndex]);

  return (
    <TableCell
      data-col={colIndex}
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        textAlign: "center",
        verticalAlign: "middle",
        p: "4px",
        minWidth: 48,
        height: 48,
        cursor: onClick ? "pointer" : "default",
        bgcolor: "background.paper",
        borderBottom: 1,
        borderBottomColor: (t) =>
          t.palette.mode === "dark"
            ? alpha(t.palette.divider, 0.4)
            : t.palette.grey[100],
        borderRight: 1,
        borderRightColor: (t) =>
          t.palette.mode === "dark"
            ? alpha(t.palette.divider, 0.4)
            : t.palette.grey[100],
        transition: "background-color 0.12s ease",
        "&:hover": onClick
          ? {
              bgcolor: (t) =>
                t.palette.mode === "dark"
                  ? alpha(t.palette.primary.main, 0.1)
                  : alpha(t.palette.primary.main, 0.04),
            }
          : undefined,
        // Column highlight style applied via classList
        "&.col-highlight": {
          bgcolor: (t) =>
            t.palette.mode === "dark"
              ? alpha(t.palette.primary.main, 0.08)
              : alpha(t.palette.primary.main, 0.04),
        },
      }}
    >
      <span
        style={{
          opacity: dimmed ? 0.15 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        <StatusIcon
          status={column.status}
          regressedCount={column.regressed_tests?.length}
        />
      </span>
    </TableCell>
  );
}
