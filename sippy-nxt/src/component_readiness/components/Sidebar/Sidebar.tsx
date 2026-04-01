import {
  alpha,
  Box,
  Button,
  ButtonBase,
  Collapse,
  Divider,
  Typography,
  useTheme,
} from "@mui/material";
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  PlayArrow as GenerateIcon,
} from "@mui/icons-material";
import { useState } from "react";
import type { Release, View } from "../../types";
import { useComponentReadinessStore } from "../../store/store";
import AdvancedOptions from "./AdvancedOptions";
import GroupBySelector from "./GroupBySelector";
import ReleaseSelector from "./ReleaseSelector";
import TestOptions from "./TestOptions";
import VariantFilters from "./VariantFilters";
import ViewPicker from "./ViewPicker";

interface SidebarProps {
  views?: View[];
  selectedView?: string | null;
  onViewChange?: (view: string) => void;
  baseRelease?: Release;
  sampleRelease?: Release;
  onSampleStartChange?: (date: string) => void;
  onSampleEndChange?: (date: string) => void;
  onBaseStartChange?: (date: string) => void;
  onBaseEndChange?: (date: string) => void;
  variants?: Record<string, string[]>;
  selectedVariants?: Record<string, string[]>;
  onVariantsChange?: (updated: Record<string, string[]>) => void;
  columnGroupBy?: string[];
  onColumnGroupByChange?: (groups: string[]) => void;
  availableCapabilities?: string[];
  selectedCapabilities?: string[];
  onCapabilitiesChange?: (caps: string[]) => void;
  availableLifecycles?: string[];
  selectedLifecycles?: string[];
  onLifecyclesChange?: (lifecycles: string[]) => void;
  onGenerateReport?: () => void;
}

export default function Sidebar({
  views = [],
  selectedView = null,
  onViewChange,
  baseRelease,
  sampleRelease,
  onSampleStartChange,
  onSampleEndChange,
  onBaseStartChange,
  onBaseEndChange,
  variants = {},
  selectedVariants = {},
  onVariantsChange,
  columnGroupBy = [],
  onColumnGroupByChange,
  availableCapabilities = [],
  selectedCapabilities = [],
  onCapabilitiesChange,
  availableLifecycles = [],
  selectedLifecycles = [],
  onLifecyclesChange,
  onGenerateReport,
}: SidebarProps) {
  const theme = useTheme();
  const hasChanges = useComponentReadinessStore((s) => s.hasUnsavedChanges)();
  const HIDDEN_GROUPS = new Set([
    "Aggregation", "FromRelease", "FromReleaseMajor", "FromReleaseMinor",
    "NetworkStack", "Release", "ReleaseMajor", "ReleaseMinor",
    "Scheduler", "SecurityMode",
  ]);
  const availableGroups = Object.keys(variants)
    .filter((k) => !HIDDEN_GROUPS.has(k))
    .sort();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Scrollable content area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          px: 1.5,
          pt: 1.5,
          pb: 1,
          // Subtle scrollbar
          "&::-webkit-scrollbar": {
            width: 4,
          },
          "&::-webkit-scrollbar-track": {
            bgcolor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: alpha(theme.palette.text.disabled, 0.2),
            borderRadius: 2,
            "&:hover": {
              bgcolor: alpha(theme.palette.text.disabled, 0.35),
            },
          },
          scrollbarWidth: "thin",
          scrollbarColor: `${alpha(theme.palette.text.disabled, 0.2)} transparent`,
        }}
      >
        {/* View Picker */}
        {views.length > 0 && (
          <Section title="View">
            <ViewPicker
              views={views}
              selectedView={selectedView}
              onViewChange={onViewChange ?? (() => {})}
            />
          </Section>
        )}

        {/* Releases */}
        <Section title="Releases">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <ReleaseSelector
              label="Sample"
              release={sampleRelease}
              onStartChange={onSampleStartChange}
              onEndChange={onSampleEndChange}
            />
            <ReleaseSelector
              label="Basis"
              release={baseRelease}
              onStartChange={onBaseStartChange}
              onEndChange={onBaseEndChange}
            />
          </Box>
        </Section>

        {/* Column Grouping */}
        {availableGroups.length > 0 && onColumnGroupByChange && (
          <Section title="Columns">
            <GroupBySelector
              availableGroups={availableGroups}
              selectedGroups={columnGroupBy}
              onChange={onColumnGroupByChange}
            />
          </Section>
        )}

        {/* Variant Filters */}
        <CollapsibleSection title="Include Variants" defaultExpanded={false}>
          <VariantFilters
            variants={variants}
            selected={selectedVariants}
            onChange={onVariantsChange ?? (() => {})}
          />
        </CollapsibleSection>

        {/* Test Options */}
        <CollapsibleSection title="Test Filters" defaultExpanded={false}>
          <TestOptions
            availableCapabilities={availableCapabilities}
            selectedCapabilities={selectedCapabilities}
            onCapabilitiesChange={onCapabilitiesChange ?? (() => {})}
            availableLifecycles={availableLifecycles}
            selectedLifecycles={selectedLifecycles}
            onLifecyclesChange={onLifecyclesChange ?? (() => {})}
          />
        </CollapsibleSection>

        {/* Advanced Options */}
        <CollapsibleSection title="Advanced" defaultExpanded={false}>
          <AdvancedOptions />
        </CollapsibleSection>
      </Box>

      {/* Sticky Generate Report button at bottom */}
      {onGenerateReport && (
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            borderTop: "1px solid",
            borderColor: alpha(theme.palette.divider, 0.12),
            bgcolor: "background.paper",
          }}
        >
          <Button
            variant="contained"
            fullWidth
            disabled={!hasChanges}
            startIcon={<GenerateIcon />}
            onClick={onGenerateReport}
            sx={{
              borderRadius: 2,
              py: 1,
              fontWeight: 600,
              fontSize: "0.85rem",
              textTransform: "none",
              letterSpacing: 0.2,
              boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
              "&:hover": {
                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
              },
            }}
          >
            Generate Report
          </Button>
        </Box>
      )}
    </Box>
  );
}

/**
 * A simple section with a label. Always visible.
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        variant="overline"
        sx={{
          fontSize: "0.6rem",
          fontWeight: 700,
          letterSpacing: 1,
          color: alpha(theme.palette.text.secondary, 0.6),
          display: "block",
          mb: 0.75,
        }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/**
 * A collapsible section with expand/collapse toggle for progressive disclosure.
 */
function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box sx={{ mb: 0.5 }}>
      <ButtonBase
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          py: 0.5,
          px: 0,
          gap: 0.25,
          justifyContent: "flex-start",
          borderRadius: 1,
        }}
      >
        {expanded ? (
          <ExpandIcon
            sx={{
              fontSize: 16,
              color: alpha(theme.palette.text.secondary, 0.5),
            }}
          />
        ) : (
          <CollapseIcon
            sx={{
              fontSize: 16,
              color: alpha(theme.palette.text.secondary, 0.5),
              // Use a right-pointing arrow when collapsed
              transform: "rotate(0deg)",
            }}
          />
        )}
        <Typography
          variant="overline"
          sx={{
            fontSize: "0.6rem",
            fontWeight: 700,
            letterSpacing: 1,
            color: alpha(theme.palette.text.secondary, 0.6),
            lineHeight: 1,
          }}
        >
          {title}
        </Typography>
      </ButtonBase>
      <Collapse in={expanded}>
        <Box sx={{ pt: 0.5, pb: 1 }}>{children}</Box>
      </Collapse>
      {!expanded && (
        <Divider
          sx={{
            borderColor: alpha(theme.palette.divider, 0.06),
            mb: 0.5,
          }}
        />
      )}
    </Box>
  );
}
