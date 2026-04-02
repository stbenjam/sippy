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

// FailedFixedRegression: danger square with an X
function FailedFixedRegressionIcon() {
  const theme = useTheme();
  const fill = theme.palette.error.dark;
  return (
    <SvgIcon>
      <rect x="1.5" y="1.5" width="17" height="17" rx="2" fill={fill} />
      <rect x="3.5" y="3.5" width="13" height="13" rx="1" fill={alpha(fill, 0.3)} />
      {/* X mark */}
      <path
        d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

// ExtremeRegression: double exclamation
function ExtremeRegressionIcon() {
  const theme = useTheme();
  const fill = theme.palette.error.main;
  return (
    <SvgIcon>
      <rect x="1.5" y="1.5" width="17" height="17" rx="2" fill={fill} />
      {/* Double exclamation */}
      <rect x="6.5" y="5.5" width="2" height="5.5" rx="1" fill="#fff" />
      <circle cx="7.5" cy="13.5" r="1.2" fill="#fff" />
      <rect x="11.5" y="5.5" width="2" height="5.5" rx="1" fill="#fff" />
      <circle cx="12.5" cy="13.5" r="1.2" fill="#fff" />
    </SvgIcon>
  );
}

// SignificantRegression: single warning square (lighter red, no inner border)
function SignificantRegressionIcon() {
  const theme = useTheme();
  const fill = theme.palette.error.main;
  return (
    <SvgIcon>
      <rect x="1.5" y="1.5" width="17" height="17" rx="2" fill={fill} />
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
      <rect x="1.5" y="1.5" width="17" height="17" rx="2" fill={alpha(fill, 0.55)} />
      <rect
        x="1.5"
        y="1.5"
        width="17"
        height="17"
        rx="2"
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
  const fill = theme.palette.error.main;
  return (
    <SvgIcon>
      <rect x="1.5" y="1.5" width="17" height="17" rx="2" fill={alpha(fill, 0.5)} />
      <rect
        x="1.5"
        y="1.5"
        width="17"
        height="17"
        rx="2"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      <TriageCheck color="#fff" />
    </SvgIcon>
  );
}

// FixedRegression: resolved, pending verification
function FixedRegressionIcon() {
  const theme = useTheme();
  const stroke = theme.palette.info.main;
  return (
    <SvgIcon>
      <rect
        x="1.5"
        y="1.5"
        width="17"
        height="17"
        rx="2"
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

// MissingSample: half square — right side empty
function MissingSampleIcon() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const baseColor = isDark ? "#66bb6a" : "#43a047";
  const emptyColor = isDark ? alpha("#66bb6a", 0.2) : alpha("#43a047", 0.15);
  return (
    <SvgIcon>
      <rect x="1.5" y="1.5" width="17" height="17" rx="2" fill={emptyColor} />
      {/* Left half filled */}
      <rect x="1.5" y="1.5" width="8.5" height="17" rx="2" fill={baseColor} />
      <rect
        x="1.5"
        y="1.5"
        width="17"
        height="17"
        rx="2"
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

// NotSignificant: healthy green square with subtle check
function NotSignificantIcon() {
  const theme = useTheme();
  const fill = theme.palette.success.main;
  return (
    <SvgIcon>
      <rect x="1.5" y="1.5" width="17" height="17" rx="2" fill={fill} />
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

// MissingBasis: half square — left side empty
function MissingBasisIcon() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const baseColor = isDark ? "#66bb6a" : "#43a047";
  const emptyColor = isDark ? alpha("#66bb6a", 0.2) : alpha("#43a047", 0.15);
  return (
    <SvgIcon>
      <rect x="1.5" y="1.5" width="17" height="17" rx="2" fill={emptyColor} />
      {/* Right half filled */}
      <rect x="10" y="1.5" width="8.5" height="17" rx="2" fill={baseColor} />
      <rect
        x="1.5"
        y="1.5"
        width="17"
        height="17"
        rx="2"
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

// MissingBasisAndSample: empty dashed square
function MissingBasisAndSampleIcon() {
  const isDark = useTheme().palette.mode === "dark";
  const color = isDark ? "#66bb6a" : "#43a047";
  return (
    <SvgIcon>
      <rect
        x="2"
        y="2"
        width="16"
        height="16"
        rx="2"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeDasharray="4 3"
      />
      {/* Dash in center */}
      <line
        x1="7"
        y1="10"
        x2="13"
        y2="10"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

// SignificantImprovement: upward arrow in a square
function SignificantImprovementIcon() {
  const theme = useTheme();
  const fill = theme.palette.primary.main;
  return (
    <SvgIcon>
      <rect x="1.5" y="1.5" width="17" height="17" rx="2" fill={fill} />
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
