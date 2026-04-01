import {
  alpha,
  Box,
  ButtonBase,
  Collapse,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
} from "@mui/icons-material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { useCallback, useState } from "react";
import type { Release } from "../../types";

interface ReleaseSelectorProps {
  label: string;
  release?: Release;
  onStartChange?: (date: string) => void;
  onEndChange?: (date: string) => void;
}

const PRESET_RANGES = [
  { label: "1W", days: 7 },
  { label: "2W", days: 14 },
  { label: "4W", days: 28 },
] as const;

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateShort(iso?: string): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ReleaseSelector({
  label,
  release,
  onStartChange,
  onEndChange,
}: ReleaseSelectorProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const setRange = useCallback(
    (days: number) => {
      const now = new Date();
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      onStartChange?.(toISO(start));
      onEndChange?.(toISO(now));
    },
    [onStartChange, onEndChange],
  );

  if (!release) {
    return (
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.text.disabled, 0.04),
          border: "1px dashed",
          borderColor: alpha(theme.palette.divider, 0.4),
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "text.secondary",
          }}
        >
          {label}
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.25 }}>
          Not configured
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        border: "1px solid",
        borderColor: alpha(theme.palette.divider, 0.12),
        overflow: "hidden",
        transition: "border-color 0.2s ease",
        "&:hover": {
          borderColor: alpha(theme.palette.primary.main, 0.2),
        },
      }}
    >
      {/* Header row — always visible */}
      <ButtonBase
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          p: 1.25,
          gap: 1,
          justifyContent: "space-between",
          textAlign: "left",
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "text.secondary",
              fontSize: "0.65rem",
            }}
          >
            {label}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 700,
                color: "primary.main",
                lineHeight: 1.3,
              }}
            >
              {release.release}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontSize: "0.7rem" }}
            >
              {formatDateShort(release.start)} – {formatDateShort(release.end)}
            </Typography>
          </Box>
        </Box>
        {expanded ? (
          <CollapseIcon
            sx={{ fontSize: 18, color: "text.secondary", flexShrink: 0 }}
          />
        ) : (
          <ExpandIcon
            sx={{ fontSize: 18, color: "text.secondary", flexShrink: 0 }}
          />
        )}
      </ButtonBase>

      {/* Expanded date editors */}
      <Collapse in={expanded}>
        <Box
          sx={{
            px: 1.25,
            pb: 1.25,
            borderTop: "1px solid",
            borderColor: alpha(theme.palette.divider, 0.08),
          }}
        >
          {/* Quick presets */}
          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              my: 1,
            }}
          >
            {PRESET_RANGES.map((preset) => (
              <ButtonBase
                key={preset.label}
                onClick={() => setRange(preset.days)}
                sx={{
                  flex: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "text.secondary",
                  bgcolor: alpha(theme.palette.action.hover, 0.06),
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                  },
                }}
              >
                {preset.label}
              </ButtonBase>
            ))}
          </Box>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack spacing={1}>
              <DatePicker
                label="From"
                value={parseDate(release.start)}
                disableFuture
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    variant: "outlined",
                    sx: {
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1.5,
                        fontSize: "0.8rem",
                      },
                      "& .MuiInputLabel-root": {
                        fontSize: "0.8rem",
                      },
                    },
                  },
                }}
                onChange={(d) => d && onStartChange?.(toISO(d))}
              />
              <DatePicker
                label="To"
                value={parseDate(release.end)}
                disableFuture
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    variant: "outlined",
                    sx: {
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1.5,
                        fontSize: "0.8rem",
                      },
                      "& .MuiInputLabel-root": {
                        fontSize: "0.8rem",
                      },
                    },
                  },
                }}
                onChange={(d) => d && onEndChange?.(toISO(d))}
              />
            </Stack>
          </LocalizationProvider>
        </Box>
      </Collapse>
    </Box>
  );
}
