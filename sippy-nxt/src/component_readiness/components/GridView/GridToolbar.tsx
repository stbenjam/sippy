import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Popover,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Clear as ClearIcon,
  ContentCopy as ContentCopyIcon,
  ErrorOutline as ErrorIcon,
  Search as SearchIcon,
  Work as JobIcon,
} from "@mui/icons-material";
import { useCallback, useState } from "react";

interface GridToolbarProps {
  searchRowRegex: string;
  onSearchRowChange: (value: string) => void;
  redOnlyChecked: boolean;
  onRedOnlyChange: (checked: boolean) => void;
  totalRows?: number;
  visibleRows?: number;
  regressionCount?: number;
  onViewJobs?: () => void;
  onViewRegressions?: () => void;
}

export default function GridToolbar({
  searchRowRegex,
  onSearchRowChange,
  redOnlyChecked,
  onRedOnlyChange,
  totalRows,
  visibleRows,
  regressionCount,
  onViewJobs,
  onViewRegressions,
}: GridToolbarProps) {
  const [copyAnchor, setCopyAnchor] = useState<HTMLElement | null>(null);

  const handleCopyUrl = useCallback((event: React.MouseEvent<HTMLElement>) => {
    navigator.clipboard.writeText(window.location.href);
    setCopyAnchor(event.currentTarget);
    setTimeout(() => setCopyAnchor(null), 1500);
  }, []);

  // Check if the regex is valid
  let regexValid = true;
  if (searchRowRegex) {
    try {
      new RegExp(searchRowRegex);
    } catch {
      regexValid = false;
    }
  }

  const hasActiveFilters = searchRowRegex !== "" || redOnlyChecked;
  const showingSubset =
    totalRows !== undefined &&
    visibleRows !== undefined &&
    visibleRows < totalRows;

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2.5,
        py: 1.5,
        mb: 0,
        borderBottom: 1,
        borderColor: "divider",
        borderRadius: 0,
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? alpha(t.palette.background.paper, 0.6)
            : t.palette.background.paper,
        backdropFilter: "blur(8px)",
      }}
    >
      <TextField
        size="small"
        placeholder="Search components (regex supported)"
        value={searchRowRegex}
        onChange={(e) => onSearchRowChange(e.target.value)}
        variant="outlined"
        error={!regexValid}
        sx={{
          width: 300,
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            fontSize: "0.875rem",
            transition: "box-shadow 0.2s ease",
            "&.Mui-focused": {
              boxShadow: (t) =>
                `0 0 0 3px ${alpha(t.palette.primary.main, 0.15)}`,
            },
          },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  fontSize="small"
                  sx={{ color: "text.secondary", opacity: 0.7 }}
                />
              </InputAdornment>
            ),
            endAdornment: searchRowRegex ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => onSearchRowChange("")}
                  edge="end"
                  sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          cursor: "pointer",
          userSelect: "none",
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          border: 1,
          borderColor: redOnlyChecked ? "error.main" : "divider",
          bgcolor: (t) =>
            redOnlyChecked ? alpha(t.palette.error.main, 0.08) : "transparent",
          transition: "all 0.2s ease",
          "&:hover": {
            borderColor: "error.main",
            bgcolor: (t) => alpha(t.palette.error.main, 0.04),
          },
        }}
        onClick={() => onRedOnlyChange(!redOnlyChecked)}
      >
        <ErrorIcon
          fontSize="small"
          sx={{
            color: redOnlyChecked ? "error.main" : "text.disabled",
            fontSize: 18,
          }}
        />
        <Typography
          variant="body2"
          sx={{
            color: redOnlyChecked ? "error.main" : "text.secondary",
            fontWeight: redOnlyChecked ? 600 : 400,
            fontSize: "0.8125rem",
          }}
        >
          Regressions only
        </Typography>
        <Switch
          checked={redOnlyChecked}
          size="small"
          color="error"
          sx={{
            ml: 0.5,
            // Make the switch more compact
            width: 32,
            height: 18,
            padding: 0,
            "& .MuiSwitch-switchBase": {
              padding: "2px",
              "&.Mui-checked": {
                transform: "translateX(14px)",
              },
            },
            "& .MuiSwitch-thumb": {
              width: 14,
              height: 14,
            },
            "& .MuiSwitch-track": {
              borderRadius: 9,
            },
          }}
          tabIndex={-1}
        />
      </Box>

      {(regressionCount === undefined || regressionCount > 0) && (
        <Chip
          icon={<ErrorIcon sx={{ fontSize: 16 }} />}
          label={
            regressionCount === undefined
              ? "..."
              : `${regressionCount} regression${regressionCount === 1 ? "" : "s"}`
          }
          size="small"
          color="error"
          variant="outlined"
          onClick={regressionCount !== undefined ? onViewRegressions : undefined}
          sx={{
            cursor:
              onViewRegressions && regressionCount !== undefined
                ? "pointer"
                : "default",
            fontWeight: 600,
            fontSize: "0.8125rem",
            height: 30,
            borderRadius: 2,
            transition: "all 0.2s ease",
            "&:hover":
              onViewRegressions && regressionCount !== undefined
                ? {
                    bgcolor: (t) => alpha(t.palette.error.main, 0.08),
                    borderColor: "error.main",
                  }
                : undefined,
          }}
        />
      )}

      {onViewJobs && (
        <Tooltip title="View CI jobs in this report" arrow>
          <IconButton
            size="small"
            onClick={onViewJobs}
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              width: 34,
              height: 34,
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
              },
            }}
          >
            <JobIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Copy shareable link" arrow>
        <IconButton
          size="small"
          onClick={handleCopyUrl}
          sx={{
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            width: 34,
            height: 34,
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
            },
          }}
        >
          <ContentCopyIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      {hasActiveFilters && showingSubset && (
        <Chip
          label={`${visibleRows} of ${totalRows} components`}
          size="small"
          variant="outlined"
          sx={{
            fontSize: "0.75rem",
            height: 24,
            borderColor: "divider",
            color: "text.secondary",
          }}
        />
      )}

      <Box sx={{ flexGrow: 1 }} />

      <Popover
        open={Boolean(copyAnchor)}
        anchorEl={copyAnchor}
        onClose={() => setCopyAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              borderRadius: 2,
              boxShadow: (t) =>
                `0 4px 12px ${alpha(t.palette.common.black, 0.1)}`,
            },
          },
        }}
      >
        <Typography
          sx={{
            px: 2,
            py: 1,
            fontSize: "0.8125rem",
            color: "success.main",
            fontWeight: 500,
          }}
        >
          Link copied!
        </Typography>
      </Popover>
    </Paper>
  );
}
