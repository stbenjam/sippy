import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  Link,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  CheckCircleOutline as IncludedIcon,
  Close as CloseIcon,
  HelpOutline as DiagnoseIcon,
  HighlightOff as ExcludedIcon,
  OpenInNew as OpenInNewIcon,
  Search as SearchIcon,
  Work as JobIcon,
} from "@mui/icons-material";
import { useCallback, useMemo, useState } from "react";
import type {
  ExclusionReason,
  JobDiagnosis,
  NormalizedJob,
  ViewJobsResponse,
} from "../../types/jobs";

const API_BASE = import.meta.env.VITE_API_URL || "";

function formatDateRange(start: string, end: string): string {
  const fmt = (s: string) => s.slice(0, 10); // "2026-03-18T00:00:00Z" → "2026-03-18"
  return `${fmt(start)} – ${fmt(end)}`;
}

interface ViewJobsModalProps {
  open: boolean;
  onClose: () => void;
  data?: ViewJobsResponse;
  isLoading?: boolean;
}

/** Build a classic Sippy job analysis link. */
function jobAnalysisLink(release: string, jobName: string): string {
  const filter = JSON.stringify({
    items: [{ columnField: "name", operatorValue: "equals", value: jobName }],
  });
  return `/sippy-ng/jobs/${release}/analysis?filters=${encodeURIComponent(filter)}`;
}

export default function ViewJobsModal({
  open,
  onClose,
  data,
  isLoading,
}: ViewJobsModalProps) {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [diagnoseOpen, setDiagnoseOpen] = useState(false);
  const [diagnoseQuery, setDiagnoseQuery] = useState("");
  const [diagnosis, setDiagnosis] = useState<JobDiagnosis | null>(null);
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [diagnoseError, setDiagnoseError] = useState<string | null>(null);

  const handleDiagnose = useCallback(async () => {
    if (!diagnoseQuery.trim()) return;
    setDiagnoseLoading(true);
    setDiagnoseError(null);
    setDiagnosis(null);

    try {
      // First check if the job is already in the included list
      const query = diagnoseQuery.trim().toLowerCase();
      const found = data?.jobs.find(
        (j) =>
          j.sample?.job_name.toLowerCase() === query ||
          j.basis?.job_name.toLowerCase() === query,
      );

      if (found) {
        setDiagnosis({
          job_name:
            found.sample?.job_name ??
            found.basis?.job_name ??
            found.normalized_name,
          included: true,
          variants: found.variants,
          exclusion_reasons: [],
        });
      } else {
        // Call the real diagnose API
        const params = new URLSearchParams(window.location.search);
        params.set("job", diagnoseQuery.trim());
        const res = await fetch(
          `${API_BASE}/api/component_readiness/jobs/diagnose?${params.toString()}`,
        );
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }
        const result: JobDiagnosis = await res.json();
        setDiagnosis(result);
      }
    } catch (err) {
      setDiagnoseError(
        err instanceof Error ? err.message : "Failed to diagnose job",
      );
    } finally {
      setDiagnoseLoading(false);
    }
  }, [diagnoseQuery, data]);

  const filteredJobs = useMemo(() => {
    if (!data?.jobs) return [];
    if (!search.trim()) return data.jobs;
    const lower = search.toLowerCase();
    return data.jobs.filter(
      (job) =>
        job.normalized_name.toLowerCase().includes(lower) ||
        job.sample?.job_name.toLowerCase().includes(lower) ||
        job.basis?.job_name.toLowerCase().includes(lower) ||
        Object.values(job.variants).some((v) =>
          v.toLowerCase().includes(lower),
        ),
    );
  }, [data, search]);

  const stats = useMemo(() => {
    if (!data?.jobs.length)
      return {
        total: 0,
        sampleOnly: 0,
        basisOnly: 0,
        both: 0,
      };
    const jobs = data.jobs;
    return {
      total: jobs.length,
      sampleOnly: jobs.filter((j) => j.sample && !j.basis).length,
      basisOnly: jobs.filter((j) => !j.sample && j.basis).length,
      both: jobs.filter((j) => j.sample && j.basis).length,
    };
  }, [data]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "min(1300px, 92vw)",
          height: "min(800px, 85vh)",
          borderRadius: 3,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          pb: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <JobIcon sx={{ color: "primary.main" }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            CI Jobs in View
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Jobs contributing test data to the current Component Readiness
            report
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          p: 0,
          overflow: "hidden",
        }}
      >
        {/* Summary + Search */}
        <Box
          sx={{
            px: 2.5,
            py: 1.25,
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexShrink: 0,
            borderBottom: "1px solid",
            borderColor: alpha(theme.palette.divider, 0.08),
          }}
        >
          <StatBadge label="Total Jobs" value={String(stats.total)} />
          <StatBadge label="Both" value={String(stats.both)} />
          {stats.sampleOnly > 0 && (
            <StatBadge
              label="Sample Only"
              value={String(stats.sampleOnly)}
              color={theme.palette.info.main}
            />
          )}
          {stats.basisOnly > 0 && (
            <StatBadge
              label="Basis Only"
              value={String(stats.basisOnly)}
              color={theme.palette.warning.main}
            />
          )}
          {data && (
            <StatBadge
              label="Releases"
              value={`${data.sample_release} vs ${data.basis_release}`}
            />
          )}

          {search && (
            <StatBadge
              label="Showing"
              value={`${filteredJobs.length} of ${stats.total}`}
            />
          )}

          <Box sx={{ flex: 1 }} />

          <TextField
            size="small"
            placeholder="Filter jobs or variants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              width: 280,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                fontSize: "0.85rem",
              },
            }}
          />
        </Box>

        {/* Diagnose panel */}
        <Box
          sx={{
            px: 2.5,
            flexShrink: 0,
            borderBottom: diagnoseOpen
              ? `1px solid ${alpha(theme.palette.divider, 0.08)}`
              : "none",
          }}
        >
          <Button
            size="small"
            startIcon={<DiagnoseIcon sx={{ fontSize: 16 }} />}
            onClick={() => {
              setDiagnoseOpen(!diagnoseOpen);
              if (!diagnoseOpen) {
                setDiagnosis(null);
                setDiagnoseError(null);
              }
            }}
            sx={{
              textTransform: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "text.secondary",
              py: 0.75,
              "&:hover": { color: "primary.main" },
            }}
          >
            Why isn't my job included?
          </Button>

          <Collapse in={diagnoseOpen}>
            <Box sx={{ pb: 1.5 }}>
              <Box
                sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}
              >
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Paste a job name, e.g. periodic-ci-openshift-release-master-ci-4.18-e2e-openstack-ovn"
                  value={diagnoseQuery}
                  onChange={(e) => setDiagnoseQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDiagnose();
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon
                            sx={{ fontSize: 18, color: "text.disabled" }}
                          />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontSize: "0.82rem",
                      fontFamily: "monospace",
                    },
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleDiagnose}
                  disabled={!diagnoseQuery.trim() || diagnoseLoading}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 2.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  {diagnoseLoading ? "Checking..." : "Check"}
                </Button>
              </Box>

              {diagnoseError && (
                <Typography
                  variant="body2"
                  sx={{ color: "error.main", fontSize: "0.82rem", mb: 1 }}
                >
                  Error: {diagnoseError}
                </Typography>
              )}
              {diagnosis && <DiagnosisResult diagnosis={diagnosis} />}
            </Box>
          </Collapse>
        </Box>

        {/* Job table */}
        {isLoading ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">
              Loading jobs...
            </Typography>
          </Box>
        ) : (
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            "&::-webkit-scrollbar": { width: 6, height: 6 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: alpha(theme.palette.text.disabled, 0.2),
              borderRadius: 3,
            },
          }}
        >
          <table
            style={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
            }}
          >
            <colgroup>
              <col style={{ width: "38%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "24%" }} />
            </colgroup>
            <thead>
              <tr>
                <Th>Job</Th>
                <Th align="center">
                  Sample ({data?.sample_release ?? "—"})
                  {data?.sample_period && (
                    <Typography
                      component="div"
                      sx={{ fontSize: "0.55rem", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "text.disabled" }}
                    >
                      {formatDateRange(data.sample_period.start, data.sample_period.end)}
                    </Typography>
                  )}
                </Th>
                <Th align="center">Net</Th>
                <Th align="center">
                  Basis ({data?.basis_release ?? "—"})
                  {data?.basis_period && (
                    <Typography
                      component="div"
                      sx={{ fontSize: "0.55rem", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "text.disabled" }}
                    >
                      {formatDateRange(data.basis_period.start, data.basis_period.end)}
                    </Typography>
                  )}
                </Th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <JobRow
                  key={job.normalized_name}
                  job={job}
                  sampleRelease={data?.sample_release}
                  basisRelease={data?.basis_release}
                />
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: "32px 16px", textAlign: "center" }}
                  >
                    <Typography color="text.secondary" variant="body2">
                      {search
                        ? "No jobs match your search."
                        : "No jobs found."}
                    </Typography>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** A single cell showing job stats: job name link, runs, pass rate — stacked vertically. */
function ReleaseCell({
  stats,
  release,
}: {
  stats?: { job_name: string; total_runs: number; successful_runs: number; pass_rate: number };
  release?: string;
}) {
  const theme = useTheme();

  if (!stats) {
    return (
      <td
        style={{
          padding: "6px 10px",
          textAlign: "center",
          borderLeft: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontSize: "0.7rem", color: "text.disabled", fontStyle: "italic" }}
        >
          no match
        </Typography>
      </td>
    );
  }

  const color =
    stats.pass_rate >= 95
      ? theme.palette.success.main
      : stats.pass_rate >= 85
        ? theme.palette.success.light
        : stats.pass_rate >= 75
          ? theme.palette.warning.main
          : theme.palette.error.main;

  return (
    <td
      style={{
        padding: "6px 10px",
        borderLeft: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
      }}
    >
      {/* Pass rate + runs */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <LinearProgress
          variant="determinate"
          value={stats.pass_rate}
          sx={{
            width: 40,
            height: 5,
            borderRadius: 3,
            flexShrink: 0,
            bgcolor: alpha(color, 0.12),
            "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: "0.75rem",
            color,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {stats.pass_rate.toFixed(1)}%
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.7rem",
            color: "text.secondary",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          ({stats.successful_runs}/{stats.total_runs})
        </Typography>
      </Box>
      {/* Job name link */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
        <Tooltip title={stats.job_name} placement="bottom-start">
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.62rem",
              fontFamily: "monospace",
              color: "text.disabled",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "calc(100% - 20px)",
            }}
          >
            {stats.job_name}
          </Typography>
        </Tooltip>
        {release && (
          <Tooltip title="Job analysis in Sippy">
            <IconButton
              component="a"
              href={jobAnalysisLink(release, stats.job_name)}
              target="_blank"
              rel="noopener"
              size="small"
              sx={{ p: 0, ml: "auto", flexShrink: 0 }}
            >
              <OpenInNewIcon sx={{ fontSize: 12, color: "text.disabled" }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </td>
  );
}

function JobRow({
  job,
  sampleRelease,
  basisRelease,
}: {
  job: NormalizedJob;
  sampleRelease?: string;
  basisRelease?: string;
}) {
  const theme = useTheme();
  const isSampleOnly = job.sample && !job.basis;
  const isBasisOnly = !job.sample && job.basis;

  const bgColor = isSampleOnly
    ? alpha(theme.palette.info.main, 0.03)
    : isBasisOnly
      ? alpha(theme.palette.warning.main, 0.03)
      : undefined;

  const netChange =
    job.sample && job.basis
      ? job.sample.pass_rate - job.basis.pass_rate
      : undefined;

  const netColor =
    netChange === undefined
      ? theme.palette.text.disabled
      : netChange > 1
        ? theme.palette.success.main
        : netChange < -1
          ? theme.palette.error.main
          : theme.palette.text.secondary;

  return (
    <tr
      style={{
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
        backgroundColor: bgColor,
      }}
    >
      {/* Normalized job name — truncated, variants on hover */}
      <td
        style={{
          padding: "6px 10px",
          fontFamily: "monospace",
          fontSize: "0.72rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          borderLeft: isSampleOnly
            ? `3px solid ${theme.palette.info.main}`
            : isBasisOnly
              ? `3px solid ${theme.palette.warning.main}`
              : "3px solid transparent",
        }}
      >
        <Tooltip
          title={
            <Box>
              <Typography
                sx={{ fontSize: "0.72rem", fontFamily: "monospace", mb: 0.5 }}
              >
                {job.normalized_name}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {Object.entries(job.variants).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.6rem",
                      borderRadius: 1,
                      bgcolor: alpha("#fff", 0.15),
                      color: "#fff",
                      "& .MuiChip-label": { px: 0.5 },
                    }}
                  />
                ))}
              </Box>
            </Box>
          }
          placement="top-start"
        >
          <span>{job.normalized_name}</span>
        </Tooltip>
      </td>

      <ReleaseCell stats={job.sample} release={sampleRelease} />

      {/* Net change */}
      <td
        style={{
          padding: "6px 10px",
          textAlign: "center",
          whiteSpace: "nowrap",
          borderLeft: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      >
        {netChange !== undefined ? (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: "0.78rem",
              color: netColor,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {netChange > 0 ? "+" : ""}
            {netChange.toFixed(1)}%
          </Typography>
        ) : (
          <Typography
            variant="caption"
            sx={{ fontSize: "0.7rem", color: "text.disabled" }}
          >
            —
          </Typography>
        )}
      </td>

      <ReleaseCell stats={job.basis} release={basisRelease} />
    </tr>
  );
}

function DiagnosisResult({ diagnosis }: { diagnosis: JobDiagnosis }) {
  const theme = useTheme();

  if (diagnosis.included) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1.5,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.success.main, 0.08),
          border: "1px solid",
          borderColor: alpha(theme.palette.success.main, 0.2),
        }}
      >
        <IncludedIcon sx={{ color: "success.main", fontSize: 20 }} />
        <Box>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "success.main", fontSize: "0.85rem" }}
          >
            This job is included in the view
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
            {Object.entries(diagnosis.variants ?? {}).map(([k, v]) => (
              <Chip
                key={k}
                label={`${k}: ${v}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.error.main, 0.05),
        border: "1px solid",
        borderColor: alpha(theme.palette.error.main, 0.15),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <ExcludedIcon sx={{ color: "error.main", fontSize: 20 }} />
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: "error.main", fontSize: "0.85rem" }}
        >
          This job is excluded from the view
        </Typography>
      </Box>

      {(diagnosis.exclusion_reasons ?? []).map((reason, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: 1,
            ml: 3.5,
            mb: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontSize: "0.8rem", color: "text.secondary" }}
          >
            <strong>{reason.variant}</strong>
            {reason.job_value ? (
              <>
                {" is "}
                <Chip
                  label={reason.job_value}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.65rem",
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: "error.main",
                    fontWeight: 600,
                    "& .MuiChip-label": { px: 0.5 },
                  }}
                />
              </>
            ) : (
              <> is not set on this job</>
            )}
            {" but the view only includes "}
            {(reason.filter_values ?? []).map((v, vi) => (
              <span key={v}>
                {vi > 0 && ", "}
                <Chip
                  label={v}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.65rem",
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.success.main, 0.08),
                    color: "success.main",
                    "& .MuiChip-label": { px: 0.5 },
                  }}
                />
              </span>
            ))}
          </Typography>
        </Box>
      ))}

      {Object.keys(diagnosis.variants ?? {}).length > 0 && (
        <Box
          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1, ml: 3.5 }}
        >
          <Typography
            variant="caption"
            sx={{ fontSize: "0.7rem", color: "text.disabled", mr: 0.5 }}
          >
            Job variants:
          </Typography>
          {Object.entries(diagnosis.variants ?? {}).map(([k, v]) => (
            <Chip
              key={k}
              label={`${k}: ${v}`}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.6rem",
                borderRadius: 1,
                bgcolor: alpha(theme.palette.action.hover, 0.06),
                "& .MuiChip-label": { px: 0.5 },
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  const theme = useTheme();
  return (
    <th
      style={{
        padding: "8px 10px 6px",
        textAlign: align,
        fontWeight: 700,
        fontSize: "0.7rem",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: alpha(theme.palette.text.secondary, 0.7),
        borderBottom: `2px solid ${alpha(theme.palette.divider, 0.12)}`,
        whiteSpace: "nowrap",
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {children}
    </th>
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          fontSize: "0.6rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: alpha(theme.palette.text.secondary, 0.5),
          display: "block",
          lineHeight: 1,
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          fontSize: "0.85rem",
          color: color ?? "text.primary",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
