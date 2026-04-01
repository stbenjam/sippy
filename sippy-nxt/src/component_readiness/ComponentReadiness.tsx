import { Box, Portal } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useComponentReadinessStore } from "./store/store";
import { hydrateFromURL, initURLSync } from "./store/urlSync";
import { buildReportParams, useReport } from "./hooks/useReport";
import { useTestCapabilities, useTestLifecycles } from "./hooks/useTestFilters";
import { useVariants } from "./hooks/useVariants";
import { useViewJobs } from "./hooks/useViewJobs";
import { useViews } from "./hooks/useViews";
import type { ColumnIdentification } from "./types";
import ErrorState from "./components/shared/ErrorState";
import GridView from "./components/GridView/GridView";
import LoadingState from "./components/shared/LoadingState";
import Sidebar from "./components/Sidebar/Sidebar";
import TestsPage from "./components/TestsPage/TestsPage";
import ViewJobsModal from "./components/ViewJobsModal/ViewJobsModal";

export default function ComponentReadiness() {
  const {
    data: views,
    isLoading: viewsLoading,
    error: viewsError,
  } = useViews();
  const { data: variantsData } = useVariants();
  const { data: availableCapabilities } = useTestCapabilities();
  const { data: availableLifecycles } = useTestLifecycles();
  const { data: viewJobs, isLoading: viewJobsLoading } = useViewJobs();
  const [jobsModalOpen, setJobsModalOpen] = useState(false);

  // Committed params: only updated when Generate Report is clicked (or on initial load).
  // The report hook uses these, NOT the live store state, to avoid auto-refetching on filter changes.
  const [committedParams, setCommittedParams] = useState<string | null>(null);
  const {
    data: report,
    isLoading: reportLoading,
    error: reportError,
  } = useReport(committedParams);

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

  const commitReport = useCallback(() => {
    const state = useComponentReadinessStore.getState();
    const params = buildReportParams(state);
    setCommittedParams(params.toString());
  }, []);

  // Hydrate store from URL on mount, then start syncing changes to URL.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      const hadParams = hydrateFromURL();
      if (hadParams) {
        commitReport();
      }
    }
    return initURLSync();
  }, [commitReport]);

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

  // When views load, apply the matching config:
  // - If URL hydrated a view name, look it up and apply its config (populates sidebar)
  // - If no view selected at all, default to the first view
  useEffect(() => {
    if (!views?.length) return;

    if (view && !baseRelease) {
      // URL had ?view=name but applyViewConfig hasn't run yet (no baseRelease populated)
      const match = views.find((v) => v.name === view);
      if (match) {
        applyViewConfig(match);
        setTimeout(commitReport, 0);
      }
    } else if (!view && !baseRelease) {
      // No URL params at all — default to first view
      applyViewConfig(views[0]);
      setTimeout(commitReport, 0);
    }
  }, [view, baseRelease, views, applyViewConfig, commitReport]);

  const navigate = useNavigate();

  const handleViewChange = (viewName: string) => {
    const selected = views?.find((v) => v.name === viewName);
    if (selected) {
      applyViewConfig(selected);
      // Auto-commit when switching views
      setTimeout(commitReport, 0);
    }
  };

  const handleCellClick = useCallback(
    (component: string, column: ColumnIdentification) => {
      const params = new URLSearchParams(window.location.search);
      params.set("component", component);
      for (const [k, v] of Object.entries(column.variants)) {
        params.set(k, v);
      }
      navigate(`/component_readiness/tests?${params.toString()}`);
    },
    [navigate],
  );

  const handleComponentClick = useCallback(
    (component: string) => {
      const params = new URLSearchParams(window.location.search);
      params.set("component", component);
      navigate(`/component_readiness/tests?${params.toString()}`);
    },
    [navigate],
  );

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
            onGenerateReport={commitReport}
          />
        </Portal>
      )}

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Routes>
          <Route
            index
            element={
              viewsError ? (
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
                  onViewJobs={() => setJobsModalOpen(true)}
                  onCellClick={handleCellClick}
                  onComponentClick={handleComponentClick}
                />
              )
            }
          />
          <Route path="tests" element={<TestsPage />} />
        </Routes>
      </Box>

      <ViewJobsModal
        open={jobsModalOpen}
        onClose={() => setJobsModalOpen(false)}
        data={viewJobs}
        isLoading={viewJobsLoading}
      />
    </>
  );
}
