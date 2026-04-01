import { Badge, Tooltip, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Status } from "../../types";
import { statusLabel } from "../../types";

const ICON_SIZE = 20;

// Shared SVG wrapper for consistent sizing and rendering
function SvgIcon({
  children,
  size = ICON_SIZE,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {children}
    </svg>
  );
}

// A small checkmark overlay used by triaged variants
function TriageCheck({ color }: { color: string }) {
  return (
    <path
      d="M7 10.5L9.5 13L13.5 8"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

// FailedFixedRegression: skull-like danger — a broken circle with an X
function FailedFixedRegressionIcon() {
  const theme = useTheme();
  const fill = theme.palette.error.dark;
  return (
    <SvgIcon>
      <circle cx="10" cy="10" r="8.5" fill={fill} />
      <circle cx="10" cy="10" r="6.5" fill={alpha(fill, 0.3)} />
      {/* X mark */}
      <path
        d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Broken ring effect */}
      <path
        d="M10 1.5A8.5 8.5 0 0 1 18.5 10"
        stroke={alpha("#000", 0.2)}
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
    </SvgIcon>
  );
}

// ExtremeRegression: pulsing double-ring alarm
function ExtremeRegressionIcon() {
  const theme = useTheme();
  const fill = theme.palette.error.main;
  return (
    <SvgIcon>
      <circle cx="10" cy="10" r="8.5" fill={fill} />
      <circle
        cx="10"
        cy="10"
        r="6"
        fill="none"
        stroke={alpha("#fff", 0.4)}
        strokeWidth="1"
      />
      {/* Exclamation */}
      <rect x="9" y="5.5" width="2" height="5.5" rx="1" fill="#fff" />
      <circle cx="10" cy="13.5" r="1.2" fill="#fff" />
    </SvgIcon>
  );
}

// SignificantRegression: single warning circle
function SignificantRegressionIcon() {
  const theme = useTheme();
  const fill = theme.palette.warning.dark;
  return (
    <SvgIcon>
      <circle cx="10" cy="10" r="8.5" fill={fill} />
      {/* Exclamation */}
      <rect x="9" y="5.5" width="2" height="5.5" rx="1" fill="#fff" />
      <circle cx="10" cy="13.5" r="1.2" fill="#fff" />
    </SvgIcon>
  );
}

// ExtremeTriagedRegression: like extreme but with a checkmark
function ExtremeTriagedRegressionIcon() {
  const theme = useTheme();
  const fill = theme.palette.error.main;
  return (
    <SvgIcon>
      <circle cx="10" cy="10" r="8.5" fill={alpha(fill, 0.55)} />
      <circle
        cx="10"
        cy="10"
        r="8.5"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      <TriageCheck color="#fff" />
    </SvgIcon>
  );
}

// SignificantTriagedRegression: like significant but with a checkmark
function SignificantTriagedRegressionIcon() {
  const theme = useTheme();
  const fill = theme.palette.warning.dark;
  return (
    <SvgIcon>
      <circle cx="10" cy="10" r="8.5" fill={alpha(fill, 0.5)} />
      <circle
        cx="10"
        cy="10"
        r="8.5"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      <TriageCheck color="#fff" />
    </SvgIcon>
  );
}

// FixedRegression: wrench/tool — resolved, pending verification
function FixedRegressionIcon() {
  const theme = useTheme();
  const stroke = theme.palette.info.main;
  return (
    <SvgIcon>
      <circle
        cx="10"
        cy="10"
        r="8.5"
        fill={alpha(stroke, 0.12)}
        stroke={stroke}
        strokeWidth="1.2"
      />
      <TriageCheck color={stroke} />
      {/* Small clock hint at bottom-right */}
      <circle cx="14" cy="14" r="2.5" fill={alpha(stroke, 0.2)} />
      <path
        d="M14 12.5V14H15.2"
        stroke={stroke}
        strokeWidth="0.8"
        strokeLinecap="round"
        fill="none"
      />
    </SvgIcon>
  );
}

// MissingSample: half circle — right side empty
function MissingSampleIcon() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const baseColor = isDark ? theme.palette.grey[500] : theme.palette.grey[400];
  const emptyColor = isDark ? theme.palette.grey[700] : theme.palette.grey[200];
  return (
    <SvgIcon>
      <circle cx="10" cy="10" r="8.5" fill={emptyColor} />
      {/* Left half filled */}
      <path d="M10 1.5A8.5 8.5 0 0 0 10 18.5Z" fill={baseColor} />
      <circle
        cx="10"
        cy="10"
        r="8.5"
        fill="none"
        stroke={baseColor}
        strokeWidth="0.8"
      />
      {/* Question mark on empty side */}
      <text
        x="13"
        y="13"
        textAnchor="middle"
        fontSize="7"
        fontWeight="bold"
        fill={baseColor}
      >
        ?
      </text>
    </SvgIcon>
  );
}

// NotSignificant: healthy green circle with subtle check
function NotSignificantIcon() {
  const theme = useTheme();
  const fill = theme.palette.success.main;
  return (
    <SvgIcon>
      <circle cx="10" cy="10" r="8.5" fill={fill} />
      {/* Checkmark */}
      <path
        d="M6.5 10.5L9 13L13.5 7.5"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

// MissingBasis: half circle — left side empty
function MissingBasisIcon() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const baseColor = isDark ? theme.palette.grey[500] : theme.palette.grey[400];
  const emptyColor = isDark ? theme.palette.grey[700] : theme.palette.grey[200];
  return (
    <SvgIcon>
      <circle cx="10" cy="10" r="8.5" fill={emptyColor} />
      {/* Right half filled */}
      <path d="M10 1.5A8.5 8.5 0 0 1 10 18.5Z" fill={baseColor} />
      <circle
        cx="10"
        cy="10"
        r="8.5"
        fill="none"
        stroke={baseColor}
        strokeWidth="0.8"
      />
      <text
        x="7"
        y="13"
        textAnchor="middle"
        fontSize="7"
        fontWeight="bold"
        fill={baseColor}
      >
        ?
      </text>
    </SvgIcon>
  );
}

// MissingBasisAndSample: empty dashed circle
function MissingBasisAndSampleIcon() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const color = isDark ? theme.palette.grey[600] : theme.palette.grey[400];
  return (
    <SvgIcon>
      <circle
        cx="10"
        cy="10"
        r="8"
        fill="none"
        stroke={color ?? theme.palette.grey[400]}
        strokeWidth="1.2"
        strokeDasharray="4 3"
      />
      {/* Dash in center */}
      <line
        x1="7"
        y1="10"
        x2="13"
        y2="10"
        stroke={color ?? theme.palette.grey[400]}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

// SignificantImprovement: upward arrow in a circle — celebration
function SignificantImprovementIcon() {
  const theme = useTheme();
  const fill = theme.palette.primary.main;
  return (
    <SvgIcon>
      <circle cx="10" cy="10" r="8.5" fill={fill} />
      {/* Up arrow */}
      <path
        d="M10 14V7M10 7L7 10M10 7L13 10"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

function IconForStatus({ status }: { status: number }) {
  switch (status) {
    case -1000:
      return <FailedFixedRegressionIcon />;
    case -500:
      return <ExtremeRegressionIcon />;
    case -400:
      return <SignificantRegressionIcon />;
    case -300:
      return <ExtremeTriagedRegressionIcon />;
    case -200:
      return <SignificantTriagedRegressionIcon />;
    case -150:
      return <FixedRegressionIcon />;
    case -100:
      return <MissingSampleIcon />;
    case 0:
      return <NotSignificantIcon />;
    case 100:
      return <MissingBasisIcon />;
    case 200:
      return <MissingBasisAndSampleIcon />;
    case 300:
      return <SignificantImprovementIcon />;
    default:
      return <MissingBasisAndSampleIcon />;
  }
}

interface StatusIconProps {
  status: Status;
  regressedCount?: number;
}

export default function StatusIcon({
  status,
  regressedCount,
}: StatusIconProps) {
  const label = statusLabel(status);

  const icon = (
    <Tooltip title={label} arrow enterDelay={200} leaveDelay={0}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
        }}
      >
        <IconForStatus status={status} />
      </span>
    </Tooltip>
  );

  if (regressedCount && regressedCount > 1 && status < -100) {
    return (
      <Badge
        badgeContent={regressedCount}
        color="error"
        sx={{
          "& .MuiBadge-badge": {
            height: 15,
            minWidth: 15,
            fontSize: "0.6rem",
            fontWeight: 700,
            padding: "0 3px",
            top: -1,
            right: -1,
          },
        }}
      >
        {icon}
      </Badge>
    );
  }

  return icon;
}
