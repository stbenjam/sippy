import {
  alpha,
  Box,
  ButtonBase,
  Chip,
  Collapse,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Add as AddIcon,
  ViewColumn as GroupByIcon,
} from "@mui/icons-material";
import { useCallback, useState } from "react";

interface GroupBySelectorProps {
  availableGroups: string[];
  selectedGroups: string[];
  onChange: (groups: string[]) => void;
}

export default function GroupBySelector({
  availableGroups,
  selectedGroups: selectedGroupsProp,
  onChange,
}: GroupBySelectorProps) {
  const selectedGroups = Array.isArray(selectedGroupsProp)
    ? selectedGroupsProp
    : [];
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(
    (group: string) => {
      const next = selectedGroups.includes(group)
        ? selectedGroups.filter((g) => g !== group)
        : [...selectedGroups, group];
      onChange(next);
    },
    [selectedGroups, onChange],
  );

  if (availableGroups.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        No grouping options available.
      </Typography>
    );
  }

  const unselected = availableGroups.filter(
    (g) => !selectedGroups.includes(g),
  );

  const chipSx = (isSelected: boolean) =>
    ({
      height: 26,
      fontSize: "0.7rem",
      fontWeight: isSelected ? 600 : 400,
      borderRadius: 1,
      bgcolor: isSelected
        ? alpha(theme.palette.primary.main, 0.12)
        : alpha(theme.palette.action.hover, 0.06),
      color: isSelected ? "primary.main" : "text.secondary",
      border: "1px solid",
      borderColor: isSelected
        ? alpha(theme.palette.primary.main, 0.3)
        : "transparent",
      transition: "all 0.15s ease",
      "&:hover": {
        bgcolor: isSelected
          ? alpha(theme.palette.primary.main, 0.18)
          : alpha(theme.palette.action.hover, 0.1),
      },
      "& .MuiChip-label": {
        px: 0.75,
      },
    }) as const;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          mb: 0.75,
        }}
      >
        <GroupByIcon sx={{ fontSize: 14, color: "text.secondary" }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: "text.secondary",
            fontSize: "0.65rem",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Column Grouping
        </Typography>
      </Box>

      {/* Selected chips — always visible */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {selectedGroups.map((group) => (
          <Chip
            key={group}
            label={group}
            size="small"
            onDelete={() => handleToggle(group)}
            onClick={() => handleToggle(group)}
            sx={chipSx(true)}
          />
        ))}

        {/* Expand button */}
        {unselected.length > 0 && (
          <ButtonBase
            onClick={() => setExpanded(!expanded)}
            sx={{
              height: 26,
              px: 1,
              borderRadius: 1,
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "text.secondary",
              bgcolor: alpha(theme.palette.action.hover, 0.06),
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: 0.25,
              "&:hover": {
                bgcolor: alpha(theme.palette.action.hover, 0.12),
              },
            }}
          >
            <AddIcon sx={{ fontSize: 14 }} />
            {expanded ? "Less" : `${unselected.length} more`}
          </ButtonBase>
        )}
      </Box>

      {/* Unselected chips — expandable */}
      <Collapse in={expanded}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
          {unselected.map((group) => (
            <Chip
              key={group}
              label={group}
              size="small"
              onClick={() => handleToggle(group)}
              sx={chipSx(false)}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
