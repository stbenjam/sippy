import {
  alpha,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
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

interface ViewJobsModalProps {
  open: boolean;
  onClose: () => void;
  data?: ViewJobsResponse;
}

export default function ViewJobsModal({
  open,
  onClose,
  data,
}: ViewJobsModalProps) {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [diagnoseOpen, setDiagnoseOpen] = useState(false);
  const [diagnoseQuery, setDiagnoseQuery] = useState("");
  const [diagnosis, setDiagnosis] = useState<JobDiagnosis | null>(null);

  // Mock diagnose function — real implementation would call the API
  const handleDiagnose = useCallback(() => {
    if (!diagnoseQuery.trim()) return;
    const query = diagnoseQuery.trim().toLowerCase();

    // Check if job is in the included list
    const found = data?.jobs.find(
      (j) =>
        j.normalized_name.toLowerCase().includes(query) ||
        j.sample?.job_name.toLowerCase().includes(query) ||
        j.basis?.job_name.toLowerCase().includes(query),
    );

    if (found) {
      setDiagnosis({
        job_name: found.sample?.job_name ?? found.basis?.job_name ?? found.normalized_name,
        included: true,
        variants: found.variants,
        exclusion_reasons: [],
      });
    } else {
      // Mock: generate plausible exclusion reasons
      const reasons: ExclusionReason[] = [];
      if (query.includes("openstack")) {
        reasons.push({
          variant: "Platform",
          job_value: "openstack",
          filter_values: ["aws", "gcp", "azure", "vsphere", "metal"],
        });
      } else if (query.includes("sdn")) {
        reasons.push({
          variant: "Network",
          job_value: "OpenShiftSDN",
          filter_values: ["OVNKubernetes"],
        });
      } else if (query.includes("techpreview")) {
        reasons.push({
          variant: "FeatureSet",
          job_value: "TechPreviewNoUpgrade",
          filter_values: ["Default"],
        });
      } else {
        reasons.push({
          variant: "Platform",
          job_value: "unknown",
          filter_values: ["aws", "gcp", "azure", "vsphere", "metal", "ovirt"],
        });
      }
      setDiagnosis({
        job_name: diagnoseQuery.trim(),
        included: false,
        variants: query.includes("openstack")
          ? { Platform: "openstack", Architecture: "amd64", Network: "OVNKubernetes", Topology: "ha" }
          : query.includes("sdn")
            ? { Platform: "aws", Architecture: "amd64", Network: "OpenShiftSDN", Topology: "ha" }
            : { Platform: "unknown", Architecture: "unknown" },
        exclusion_reasons: reasons,
      });
    }
  }, [diagnoseQuery, data]);

  const filteredJobs = useMemo(() => {
    if (!data?.jobs) return [];
    if (!search.trim()) return data.jobs;
    const lower = search.toLowerCase();
    return data.jobs.filter(
      (job) =>
        job.normalized_name.toLowerCase().includes(lower) ||
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
              if (!diagnoseOpen) setDiagnosis(null);
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
                  disabled={!diagnoseQuery.trim()}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 2.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  Check
                </Button>
              </Box>

              {diagnosis && <DiagnosisResult diagnosis={diagnosis} />}
            </Box>
          </Collapse>
        </Box>

        {/* Job table */}
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
              borderCollapse: "collapse",
              fontSize: "0.8rem",
            }}
          >
            <thead>
              <tr>
                <Th sticky>Job Name</Th>
                <Th>Variants</Th>
                <Th align="center" colSpan={2}>
                  Sample ({data?.sample_release ?? "—"})
                </Th>
                <Th align="center" colSpan={2}>
                  Basis ({data?.basis_release ?? "—"})
                </Th>
              </tr>
              <tr>
                <Th sticky sub>
                  &nbsp;
                </Th>
                <Th sub>&nbsp;</Th>
                <Th align="right" sub>
                  Runs
                </Th>
                <Th align="right" sub>
                  Pass Rate
                </Th>
                <Th align="right" sub>
                  Runs
                </Th>
                <Th align="right" sub>
                  Pass Rate
                </Th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <JobRow key={job.normalized_name} job={job} />
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
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
      </DialogContent>
    </Dialog>
  );
}

function JobRow({ job }: { job: NormalizedJob }) {
  const theme = useTheme();
  const isSampleOnly = job.sample && !job.basis;
  const isBasisOnly = !job.sample && job.basis;

  return (
    <tr
      style={{
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
        backgroundColor: isSampleOnly
          ? alpha(theme.palette.info.main, 0.03)
          : isBasisOnly
            ? alpha(theme.palette.warning.main, 0.03)
            : undefined,
      }}
    >
      <td
        style={{
          padding: "8px 12px",
          whiteSpace: "nowrap",
          fontFamily: "monospace",
          fontSize: "0.72rem",
          position: "sticky",
          left: 0,
          backgroundColor: isSampleOnly
            ? alpha(theme.palette.info.main, 0.03)
            : isBasisOnly
              ? alpha(theme.palette.warning.main, 0.03)
              : theme.palette.background.paper,
          zIndex: 1,
          maxWidth: 420,
          overflow: "hidden",
          textOverflow: "ellipsis",
          borderLeft: isSampleOnly
            ? `3px solid ${theme.palette.info.main}`
            : isBasisOnly
              ? `3px solid ${theme.palette.warning.main}`
              : "3px solid transparent",
        }}
      >
        <Tooltip title={job.normalized_name} placement="top-start">
          <span>{job.normalized_name}</span>
        </Tooltip>
      </td>
      <td style={{ padding: "6px 8px" }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {Object.entries(job.variants).map(([key, value]) => (
            <Chip
              key={key}
              label={`${key}: ${value}`}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                borderRadius: 1,
                bgcolor: alpha(theme.palette.action.hover, 0.08),
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          ))}
        </Box>
      </td>

      {/* Sample columns */}
      {job.sample ? (
        <>
          <td
            style={{
              padding: "6px 12px",
              textAlign: "right",
              whiteSpace: "nowrap",
            }}
          >
            <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
              {job.sample.successful_runs}/{job.sample.total_runs}
            </Typography>
          </td>
          <td
            style={{
              padding: "6px 12px",
              textAlign: "right",
              whiteSpace: "nowrap",
              minWidth: 110,
            }}
          >
            <PassRateCell rate={job.sample.pass_rate} />
          </td>
        </>
      ) : (
        <td
          colSpan={2}
          style={{
            padding: "6px 12px",
            textAlign: "center",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.7rem",
              color: "text.disabled",
              fontStyle: "italic",
            }}
          >
            not matched
          </Typography>
        </td>
      )}

      {/* Basis columns */}
      {job.basis ? (
        <>
          <td
            style={{
              padding: "6px 12px",
              textAlign: "right",
              whiteSpace: "nowrap",
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            }}
          >
            <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
              {job.basis.successful_runs}/{job.basis.total_runs}
            </Typography>
          </td>
          <td
            style={{
              padding: "6px 12px",
              textAlign: "right",
              whiteSpace: "nowrap",
              minWidth: 110,
            }}
          >
            <PassRateCell rate={job.basis.pass_rate} />
          </td>
        </>
      ) : (
        <td
          colSpan={2}
          style={{
            padding: "6px 12px",
            textAlign: "center",
            borderLeft: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.7rem",
              color: "text.disabled",
              fontStyle: "italic",
            }}
          >
            not matched
          </Typography>
        </td>
      )}
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
            {Object.entries(diagnosis.variants).map(([k, v]) => (
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

      {diagnosis.exclusion_reasons.map((reason, i) => (
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
            <strong>{reason.variant}</strong> is{" "}
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
            />{" "}
            but the view only includes{" "}
            {reason.filter_values.map((v, vi) => (
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

      {Object.keys(diagnosis.variants).length > 0 && (
        <Box
          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1, ml: 3.5 }}
        >
          <Typography
            variant="caption"
            sx={{ fontSize: "0.7rem", color: "text.disabled", mr: 0.5 }}
          >
            Job variants:
          </Typography>
          {Object.entries(diagnosis.variants).map(([k, v]) => (
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

function PassRateCell({ rate }: { rate: number }) {
  const theme = useTheme();
  const color =
    rate >= 95
      ? theme.palette.success.main
      : rate >= 85
        ? theme.palette.success.light
        : rate >= 75
          ? theme.palette.warning.main
          : theme.palette.error.main;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        justifyContent: "flex-end",
      }}
    >
      <LinearProgress
        variant="determinate"
        value={rate}
        sx={{
          width: 50,
          height: 5,
          borderRadius: 3,
          bgcolor: alpha(color, 0.12),
          "& .MuiLinearProgress-bar": {
            bgcolor: color,
            borderRadius: 3,
          },
        }}
      />
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          fontSize: "0.75rem",
          color,
          minWidth: 42,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {rate.toFixed(1)}%
      </Typography>
    </Box>
  );
}

function Th({
  children,
  align = "left",
  sticky = false,
  sub = false,
  colSpan,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  sticky?: boolean;
  sub?: boolean;
  colSpan?: number;
}) {
  const theme = useTheme();
  return (
    <th
      colSpan={colSpan}
      style={{
        padding: sub ? "2px 12px 6px" : "8px 12px 4px",
        textAlign: align,
        fontWeight: sub ? 600 : 700,
        fontSize: sub ? "0.6rem" : "0.7rem",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: alpha(
          theme.palette.text.secondary,
          sub ? 0.5 : 0.7,
        ),
        borderBottom: sub
          ? `2px solid ${alpha(theme.palette.divider, 0.12)}`
          : `1px solid ${alpha(theme.palette.divider, 0.06)}`,
        whiteSpace: "nowrap",
        position: sticky ? "sticky" : undefined,
        left: sticky ? 0 : undefined,
        backgroundColor: theme.palette.background.paper,
        zIndex: sticky ? 2 : 1,
        top: sub ? 28 : 0,
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
