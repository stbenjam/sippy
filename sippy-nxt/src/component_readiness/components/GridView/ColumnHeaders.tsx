import type { ColumnIdentification } from "../../types";
import { TableCell, TableHead, TableRow } from "@mui/material";
import { alpha } from "@mui/material/styles";

interface ColumnHeadersProps {
  columns: ColumnIdentification[];
  componentColWidth?: number;
}

function formatColumnLabel(column: ColumnIdentification): string {
  return Object.values(column.variants).join(" / ");
}

export default function ColumnHeaders({
  columns,
  componentColWidth = 250,
}: ColumnHeadersProps) {
  return (
    <TableHead>
      <TableRow>
        {/* Corner cell: component label */}
        <TableCell
          sx={{
            fontWeight: 700,
            position: "sticky",
            left: 0,
            top: 0,
            zIndex: 4,
            bgcolor: (t) =>
              t.palette.mode === "dark"
                ? t.palette.grey[900]
                : t.palette.grey[50],
            width: componentColWidth,
            minWidth: componentColWidth,
            maxWidth: componentColWidth,
            fontSize: "0.6875rem",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "text.secondary",
            borderBottom: 2,
            borderBottomColor: "divider",
            borderRight: 1,
            borderRightColor: "divider",
            py: 1.5,
            px: 2,
          }}
        >
          Component
        </TableCell>

        {columns.map((col, i) => (
          <TableCell
            key={i}
            data-col={i}
            sx={{
              fontWeight: 500,
              textAlign: "center",
              p: "4px 2px",
              whiteSpace: "nowrap",
              position: "sticky",
              top: 0,
              zIndex: 3,
              bgcolor: (t) =>
                t.palette.mode === "dark"
                  ? t.palette.grey[900]
                  : t.palette.grey[50],
              borderBottom: 2,
              borderBottomColor: "divider",
              transition: "background-color 0.15s ease",
              "&.col-highlight": {
                bgcolor: (t) =>
                  t.palette.mode === "dark"
                    ? alpha(t.palette.primary.main, 0.12)
                    : alpha(t.palette.primary.main, 0.06),
              },
            }}
          >
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                display: "inline-block",
                fontSize: "0.6875rem",
                maxHeight: 140,
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.3,
                letterSpacing: "0.01em",
              }}
            >
              {formatColumnLabel(col)}
            </span>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
