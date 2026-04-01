import {
  alpha,
  Box,
  FormControlLabel,
  Slider,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useComponentReadinessStore } from "../../store/store";

export default function AdvancedOptions() {
  const confidence = useComponentReadinessStore((s) => s.confidence);
  const pityFactor = useComponentReadinessStore((s) => s.pityFactor);
  const minimumFailure = useComponentReadinessStore((s) => s.minimumFailure);
  const passRateRequiredNewTests = useComponentReadinessStore(
    (s) => s.passRateRequiredNewTests,
  );
  const passRateRequiredAllTests = useComponentReadinessStore(
    (s) => s.passRateRequiredAllTests,
  );
  const ignoreMissing = useComponentReadinessStore((s) => s.ignoreMissing);
  const ignoreDisruption = useComponentReadinessStore(
    (s) => s.ignoreDisruption,
  );
  const flakeAsFailure = useComponentReadinessStore((s) => s.flakeAsFailure);
  const includeMultiReleaseAnalysis = useComponentReadinessStore(
    (s) => s.includeMultiReleaseAnalysis,
  );

  const setConfidence = useComponentReadinessStore((s) => s.setConfidence);
  const setPityFactor = useComponentReadinessStore((s) => s.setPityFactor);
  const setMinimumFailure = useComponentReadinessStore(
    (s) => s.setMinimumFailure,
  );
  const setPassRateRequiredNewTests = useComponentReadinessStore(
    (s) => s.setPassRateRequiredNewTests,
  );
  const setPassRateRequiredAllTests = useComponentReadinessStore(
    (s) => s.setPassRateRequiredAllTests,
  );
  const setIgnoreMissing = useComponentReadinessStore(
    (s) => s.setIgnoreMissing,
  );
  const setIgnoreDisruption = useComponentReadinessStore(
    (s) => s.setIgnoreDisruption,
  );
  const setFlakeAsFailure = useComponentReadinessStore(
    (s) => s.setFlakeAsFailure,
  );
  const setIncludeMultiReleaseAnalysis = useComponentReadinessStore(
    (s) => s.setIncludeMultiReleaseAnalysis,
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* Statistical thresholds */}
      <SectionLabel>Statistical Thresholds</SectionLabel>

      <SliderField
        label="Confidence"
        value={confidence}
        onChange={setConfidence}
        min={80}
        max={100}
        suffix="%"
        tooltip="Statistical confidence level for Fisher's exact test"
      />
      <SliderField
        label="Pity factor"
        value={pityFactor}
        onChange={setPityFactor}
        min={0}
        max={10}
        tooltip="Number of allowed failures before flagging regression"
      />
      <SliderField
        label="Min failures"
        value={minimumFailure}
        onChange={setMinimumFailure}
        min={0}
        max={20}
        tooltip="Minimum number of failures required to consider a regression"
      />

      {/* Pass rates */}
      <SectionLabel>Pass Rate Requirements</SectionLabel>

      <CompactNumberField
        label="New tests"
        value={passRateRequiredNewTests}
        onChange={setPassRateRequiredNewTests}
        min={0}
        max={100}
        suffix="%"
      />
      <CompactNumberField
        label="All tests"
        value={passRateRequiredAllTests}
        onChange={setPassRateRequiredAllTests}
        min={0}
        max={100}
        suffix="%"
      />

      {/* Behavior toggles */}
      <SectionLabel>Behavior</SectionLabel>

      <ToggleField
        label="Missing data"
        checked={ignoreMissing}
        onChange={setIgnoreMissing}
        onLabel="Ignore"
        offLabel="Keep"
      />
      <ToggleField
        label="Disruption tests"
        checked={ignoreDisruption}
        onChange={setIgnoreDisruption}
        onLabel="Ignore"
        offLabel="Keep"
      />
      <ToggleField
        label="Flakes count as"
        checked={flakeAsFailure}
        onChange={setFlakeAsFailure}
        onLabel="Failure"
        offLabel="Success"
      />
      <Tooltip title="Include analysis across multiple prior releases" arrow>
        <span>
          <ToggleField
            label="Multi-release"
            checked={includeMultiReleaseAnalysis}
            onChange={setIncludeMultiReleaseAnalysis}
            onLabel="Include"
            offLabel="Exclude"
          />
        </span>
      </Tooltip>
    </Box>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 600,
        color: "text.secondary",
        fontSize: "0.6rem",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        mt: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  suffix = "",
  tooltip,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
  tooltip?: string;
}) {
  const theme = useTheme();

  const content = (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontSize: "0.78rem", color: "text.secondary" }}
        >
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "primary.main",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
          {suffix}
        </Typography>
      </Box>
      <Slider
        size="small"
        value={value}
        onChange={(_, v) => onChange(v as number)}
        min={min}
        max={max}
        sx={{
          mt: -0.25,
          mb: -0.5,
          "& .MuiSlider-track": {
            height: 3,
          },
          "& .MuiSlider-rail": {
            height: 3,
            bgcolor: alpha(theme.palette.text.disabled, 0.15),
          },
          "& .MuiSlider-thumb": {
            width: 14,
            height: 14,
            "&:hover, &.Mui-focusVisible": {
              boxShadow: `0 0 0 6px ${alpha(theme.palette.primary.main, 0.15)}`,
            },
          },
        }}
      />
    </Box>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow placement="right">
        {content}
      </Tooltip>
    );
  }
  return content;
}

function CompactNumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
      }}
    >
      <Typography
        variant="body2"
        sx={{ fontSize: "0.78rem", color: "text.secondary" }}
      >
        {label}
      </Typography>
      <TextField
        type="number"
        size="small"
        value={value}
        onChange={(e) => {
          const v = Math.max(min, Math.min(max, parseInt(e.target.value, 10)));
          if (!isNaN(v)) onChange(v);
        }}
        slotProps={{
          htmlInput: { min, max, style: { textAlign: "right" } },
          input: suffix ? { endAdornment: <Typography variant="caption" sx={{ color: 'text.disabled', ml: 0.25 }}>{suffix}</Typography> } : undefined,
        }}
        sx={{
          width: 72,
          "& .MuiOutlinedInput-root": {
            borderRadius: 1.5,
            fontSize: "0.78rem",
          },
          "& .MuiOutlinedInput-input": {
            py: 0.5,
            px: 1,
          },
        }}
      />
    </Box>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  onLabel,
  offLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  onLabel: string;
  offLabel: string;
}) {
  const theme = useTheme();

  return (
    <FormControlLabel
      control={
        <Switch
          size="small"
          checked={checked}
          onChange={(_, v) => onChange(v)}
          sx={{
            "& .MuiSwitch-track": {
              borderRadius: 8,
            },
          }}
        />
      }
      label={
        <Typography
          variant="body2"
          sx={{ fontSize: "0.78rem", color: "text.secondary" }}
        >
          {label}:{" "}
          <Box
            component="span"
            sx={{
              fontWeight: 600,
              color: checked
                ? "primary.main"
                : alpha(theme.palette.text.primary, 0.7),
            }}
          >
            {checked ? onLabel : offLabel}
          </Box>
        </Typography>
      }
      sx={{ ml: 0, mr: 0 }}
    />
  );
}
