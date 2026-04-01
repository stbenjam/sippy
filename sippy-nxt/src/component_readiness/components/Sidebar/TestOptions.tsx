import {
  alpha,
  Autocomplete,
  Box,
  Chip,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";

interface TestOptionsProps {
  availableCapabilities: string[];
  selectedCapabilities: string[];
  onCapabilitiesChange: (caps: string[]) => void;
  availableLifecycles: string[];
  selectedLifecycles: string[];
  onLifecyclesChange: (lifecycles: string[]) => void;
}

export default function TestOptions({
  availableCapabilities,
  selectedCapabilities,
  onCapabilitiesChange,
  availableLifecycles,
  selectedLifecycles,
  onLifecyclesChange,
}: TestOptionsProps) {
  const theme = useTheme();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: "text.secondary",
            fontSize: "0.65rem",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            mb: 0.5,
            display: "block",
          }}
        >
          Capabilities
        </Typography>
        <Autocomplete
          multiple
          size="small"
          options={availableCapabilities}
          value={selectedCapabilities}
          onChange={(_, newValue) => onCapabilitiesChange(newValue)}
          freeSolo
          disableCloseOnSelect
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  label={option}
                  size="small"
                  {...tagProps}
                  sx={{
                    height: 22,
                    fontSize: "0.7rem",
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                    "& .MuiChip-deleteIcon": {
                      fontSize: 14,
                      color: alpha(theme.palette.primary.main, 0.5),
                      "&:hover": {
                        color: "primary.main",
                      },
                    },
                  }}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={
                selectedCapabilities.length === 0 ? "All capabilities" : ""
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                  fontSize: "0.8rem",
                },
              }}
            />
          )}
        />
      </Box>

      <Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: "text.secondary",
            fontSize: "0.65rem",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            mb: 0.5,
            display: "block",
          }}
        >
          Lifecycles
        </Typography>
        <Autocomplete
          multiple
          size="small"
          options={availableLifecycles}
          value={selectedLifecycles}
          onChange={(_, newValue) => onLifecyclesChange(newValue)}
          freeSolo
          disableCloseOnSelect
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  label={option}
                  size="small"
                  {...tagProps}
                  sx={{
                    height: 22,
                    fontSize: "0.7rem",
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: "info.main",
                    "& .MuiChip-deleteIcon": {
                      fontSize: 14,
                      color: alpha(theme.palette.info.main, 0.5),
                      "&:hover": {
                        color: "info.main",
                      },
                    },
                  }}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={
                selectedLifecycles.length === 0 ? "All lifecycles" : ""
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                  fontSize: "0.8rem",
                },
              }}
            />
          )}
        />
      </Box>
    </Box>
  );
}
