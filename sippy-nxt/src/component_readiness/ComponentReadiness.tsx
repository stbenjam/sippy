import { Box, Portal } from "@mui/material";
import { useEffect, useState } from "react";
import { useComponentReadinessStore } from "./store/store";
import { useReport } from "./hooks/useReport";
import { useTestCapabilities, useTestLifecycles } from "./hooks/useTestFilters";
import { useVariants } from "./hooks/useVariants";
import { useViews } from "./hooks/useViews";
import ErrorState from "./components/shared/ErrorState";
import GridView from "./components/GridView/GridView";
import LoadingState from "./components/shared/LoadingState";
import Sidebar from "./components/Sidebar/Sidebar";

export default function ComponentReadiness() {
  const {
    data: views,
    isLoading: viewsLoading,
    error: viewsError,
  } = useViews();
  const { data: variantsData } = useVariants();
  const { data: availableCapabilities } = useTestCapabilities();
  const { data: availableLifecycles } = useTestLifecycles();
  const {
    data: report,
    isLoading: reportLoading,
    error: reportError,
    refetch,
  } = useReport();

  const view = useComponentReadinessStore((s) => s.view);
  const baseRelease = useComponentReadinessStore((s) => s.baseRelease);
  const sampleRelease = useComponentReadinessStore((s) => s.sampleRelease);
  const includeVariants = useComponentReadinessStore((s) => s.includeVariants);
  const columnGroupBy = useComponentReadinessStore((s) => s.columnGroupBy);
  const applyViewConfig = useComponentReadinessStore((s) => s.applyViewConfig);
  const redOnlyFilter = useComponentReadinessStore((s) => s.redOnlyFilter);
  const searchFilter = useComponentReadinessStore((s) => s.searchFilter);

  const setSampleStartTime = useComponentReadinessStore(
    (s) => s.setSampleStartTime,
  );
  const setSampleEndTime = useComponentReadinessStore(
    (s) => s.setSampleEndTime,
  );
  const setBaseStartTime = useComponentReadinessStore(
    (s) => s.setBaseStartTime,
  );
  const setBaseEndTime = useComponentReadinessStore((s) => s.setBaseEndTime);
  const setIncludeVariants = useComponentReadinessStore(
    (s) => s.setIncludeVariants,
  );
  const setColumnGroupBy = useComponentReadinessStore(
    (s) => s.setColumnGroupBy,
  );
  const capabilities = useComponentReadinessStore((s) => s.capabilities);
  const lifecycles = useComponentReadinessStore((s) => s.lifecycles);
  const setCapabilities = useComponentReadinessStore((s) => s.setCapabilities);
  const setLifecycles = useComponentReadinessStore((s) => s.setLifecycles);

  // Wait for the drawer portal target
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  useEffect(() => {
    const el = document.getElementById("sidebar-portal");
    if (el) {
      setPortalTarget(el);
      return;
    }
    const id = setInterval(() => {
      const el = document.getElementById("sidebar-portal");
      if (el) {
        setPortalTarget(el);
        clearInterval(id);
      }
    }, 50);
    return () => clearInterval(id);
  }, []);

  // Auto-select first view when views load and none is selected
  useEffect(() => {
    if (!view && views?.length) {
      applyViewConfig(views[0]);
    }
  }, [view, views, applyViewConfig]);

  const handleViewChange = (viewName: string) => {
    const selected = views?.find((v) => v.name === viewName);
    if (selected) {
      applyViewConfig(selected);
    }
  };

  return (
    <>
      {portalTarget && (
        <Portal container={portalTarget}>
          <Sidebar
            views={views ?? []}
            selectedView={view}
            onViewChange={handleViewChange}
            baseRelease={baseRelease ?? undefined}
            sampleRelease={sampleRelease ?? undefined}
            onSampleStartChange={setSampleStartTime}
            onSampleEndChange={setSampleEndTime}
            onBaseStartChange={setBaseStartTime}
            onBaseEndChange={setBaseEndTime}
            variants={variantsData ?? {}}
            selectedVariants={includeVariants}
            onVariantsChange={setIncludeVariants}
            columnGroupBy={columnGroupBy}
            onColumnGroupByChange={setColumnGroupBy}
            availableCapabilities={availableCapabilities ?? []}
            selectedCapabilities={capabilities}
            onCapabilitiesChange={setCapabilities}
            availableLifecycles={availableLifecycles ?? []}
            selectedLifecycles={lifecycles}
            onLifecyclesChange={setLifecycles}
            onGenerateReport={() => refetch()}
          />
        </Portal>
      )}

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {viewsError ? (
          <ErrorState message={viewsError.message} />
        ) : viewsLoading ? (
          <LoadingState message="Loading views..." />
        ) : reportLoading ? (
          <LoadingState message="Loading component readiness data..." />
        ) : reportError ? (
          <ErrorState message={reportError.message} />
        ) : (
          <GridView
            report={report}
            redOnlyFilter={redOnlyFilter}
            searchFilter={searchFilter}
          />
        )}
      </Box>
    </>
  );
}
