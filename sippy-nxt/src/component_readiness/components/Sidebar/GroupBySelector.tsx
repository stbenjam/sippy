import { alpha, Box, Chip, Typography, useTheme } from "@mui/material";
import { ViewColumn as GroupByIcon } from "@mui/icons-material";
import { useCallback } from "react";

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
  const selectedGroups = Array.isArray(selectedGroupsProp) ? selectedGroupsProp : [];
  const theme = useTheme();

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

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          mb: 1,
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
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {availableGroups.map((group) => {
          const isSelected = selectedGroups.includes(group);
          return (
            <Chip
              key={group}
              label={group}
              size="small"
              onClick={() => handleToggle(group)}
              sx={{
                height: 26,
                fontSize: "0.72rem",
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
                  px: 1,
                },
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}
