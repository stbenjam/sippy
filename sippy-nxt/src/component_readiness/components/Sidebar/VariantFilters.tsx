import {
  alpha,
  Box,
  ButtonBase,
  Checkbox,
  Chip,
  Collapse,
  Typography,
  useTheme,
} from "@mui/material";
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowRight as CollapseIcon,
} from "@mui/icons-material";
import { useCallback, useState } from "react";

interface VariantFiltersProps {
  variants: Record<string, string[]>;
  selected: Record<string, string[]>;
  onChange: (updated: Record<string, string[]>) => void;
}

// Variant groups that should be hidden from the filter UI
const HIDDEN_GROUPS = new Set([
  "Aggregation",
  "FromRelease",
  "FromReleaseMajor",
  "FromReleaseMinor",
  "NetworkStack",
  "Release",
  "ReleaseMajor",
  "ReleaseMinor",
  "Scheduler",
  "SecurityMode",
]);

export default function VariantFilters({
  variants,
  selected,
  onChange,
}: VariantFiltersProps) {
  const keys = Object.keys(variants)
    .filter((k) => !HIDDEN_GROUPS.has(k))
    .sort();

  if (keys.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        No variant filters available.
      </Typography>
    );
  }

  const handleToggle = (key: string, value: string) => {
    const current = selected[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...selected, [key]: next });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
      {keys.map((key) => (
        <VariantGroup
          key={key}
          name={key}
          values={variants[key]}
          selected={selected[key] ?? []}
          onToggle={(value) => handleToggle(key, value)}
        />
      ))}
    </Box>
  );
}

function VariantGroup({
  name,
  values,
  selected,
  onToggle,
}: {
  name: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const sorted = [...values].sort();
  const count = selected.length;

  const handleToggle = useCallback(
    (value: string) => {
      onToggle(value);
    },
    [onToggle],
  );

  return (
    <Box
      sx={{
        borderRadius: 1.5,
        overflow: "hidden",
        transition: "background-color 0.15s ease",
        bgcolor: expanded
          ? alpha(theme.palette.action.hover, 0.04)
          : "transparent",
      }}
    >
      <ButtonBase
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          py: 0.625,
          px: 1,
          gap: 0.5,
          justifyContent: "flex-start",
          borderRadius: 1.5,
          "&:hover": {
            bgcolor: alpha(theme.palette.action.hover, 0.06),
          },
        }}
      >
        {expanded ? (
          <ExpandIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        ) : (
          <CollapseIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        )}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: "0.78rem",
            flex: 1,
            textAlign: "left",
          }}
        >
          {name}
        </Typography>
        {count > 0 && (
          <Chip
            label={count}
            size="small"
            sx={{
              height: 18,
              minWidth: 18,
              fontSize: "0.65rem",
              fontWeight: 700,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: "primary.main",
              "& .MuiChip-label": { px: 0.5 },
            }}
          />
        )}
      </ButtonBase>

      <Collapse in={expanded}>
        <Box sx={{ pb: 0.5, pl: 1 }}>
          {sorted.map((value) => {
            const isChecked = selected.includes(value);
            return (
              <ButtonBase
                key={value}
                onClick={() => handleToggle(value)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  py: 0.125,
                  px: 0.5,
                  gap: 0.25,
                  borderRadius: 1,
                  justifyContent: "flex-start",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.action.hover, 0.06),
                  },
                }}
              >
                <Checkbox
                  size="small"
                  checked={isChecked}
                  tabIndex={-1}
                  disableRipple
                  sx={{
                    p: 0.25,
                    "& .MuiSvgIcon-root": { fontSize: 16 },
                  }}
                />
                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    fontSize: "0.78rem",
                    color: isChecked ? "text.primary" : "text.secondary",
                    fontWeight: isChecked ? 500 : 400,
                  }}
                >
                  {value}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
}
