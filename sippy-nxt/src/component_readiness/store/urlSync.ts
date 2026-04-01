import { useComponentReadinessStore } from "./store";
import type { ComponentReadinessState } from "./store";

// Go API param names (from queryparamparser.go).
// Frontend-only params are noted.
const PARAM = {
  // View
  view: "view",

  // Releases
  baseRelease: "baseRelease",
  baseStartTime: "baseStartTime",
  baseEndTime: "baseEndTime",
  sampleRelease: "sampleRelease",
  sampleStartTime: "sampleStartTime",
  sampleEndTime: "sampleEndTime",

  // Variant options
  columnGroupBy: "columnGroupBy",
  dbGroupBy: "dbGroupBy",
  includeVariant: "includeVariant",

  // Test filters
  testCapabilities: "testCapabilities",
  testLifecycles: "testLifecycles",

  // Advanced options
  confidence: "confidence",
  pity: "pity",
  minFail: "minFail",
  passRateNewTests: "passRateNewTests",
  passRateAllTests: "passRateAllTests",
  ignoreMissing: "ignoreMissing",
  ignoreDisruption: "ignoreDisruption",
  flakeAsFailure: "flakeAsFailure",
  includeMultiReleaseAnalysis: "includeMultiReleaseAnalysis",

  // Frontend-only
  groupBy: "groupBy",
  component: "component",
  redOnly: "redOnly",
  search: "search",
} as const;

const GROUP_BY_VALUES = ["cloud", "platform", "network", "arch", "upgrade"];

function storeToParams(state: ComponentReadinessState): URLSearchParams {
  const params = new URLSearchParams();

  // If a view is applied and there are no unsaved changes, just emit ?view=name
  // plus frontend-only navigation/filter params.
  const viewOnly = state.view && !state.hasUnsavedChanges();

  if (viewOnly) {
    params.set(PARAM.view, state.view!);
  } else {
    // Emit all API-compatible params so the URL is shareable/bookmarkable.
    if (state.baseRelease) {
      params.set(PARAM.baseRelease, state.baseRelease.release);
      if (state.baseRelease.start)
        params.set(PARAM.baseStartTime, state.baseRelease.start);
      if (state.baseRelease.end)
        params.set(PARAM.baseEndTime, state.baseRelease.end);
    }
    if (state.sampleRelease) {
      params.set(PARAM.sampleRelease, state.sampleRelease.release);
      if (state.sampleRelease.start)
        params.set(PARAM.sampleStartTime, state.sampleRelease.start);
      if (state.sampleRelease.end)
        params.set(PARAM.sampleEndTime, state.sampleRelease.end);
    }

    if (state.columnGroupBy.length > 0) {
      params.set(PARAM.columnGroupBy, state.columnGroupBy.join(","));
    }
    if (state.dbGroupBy.length > 0) {
      params.set(PARAM.dbGroupBy, state.dbGroupBy.join(","));
    }

    // includeVariant: repeated param with Key:Value format
    for (const [group, values] of Object.entries(state.includeVariants)) {
      for (const val of values) {
        params.append(PARAM.includeVariant, `${group}:${val}`);
      }
    }

    // Test filters: repeated params
    for (const cap of state.capabilities) {
      params.append(PARAM.testCapabilities, cap);
    }
    for (const lc of state.lifecycles) {
      params.append(PARAM.testLifecycles, lc);
    }

    // Advanced options
    params.set(PARAM.confidence, String(state.confidence));
    params.set(PARAM.pity, String(state.pityFactor));
    params.set(PARAM.minFail, String(state.minimumFailure));
    params.set(PARAM.passRateNewTests, String(state.passRateRequiredNewTests));
    params.set(PARAM.passRateAllTests, String(state.passRateRequiredAllTests));
    params.set(PARAM.ignoreMissing, String(state.ignoreMissing));
    params.set(PARAM.ignoreDisruption, String(state.ignoreDisruption));
    params.set(PARAM.flakeAsFailure, String(state.flakeAsFailure));
    params.set(
      PARAM.includeMultiReleaseAnalysis,
      String(state.includeMultiReleaseAnalysis),
    );
  }

  // Frontend-only params (always emitted when set)
  if (state.groupBy !== "cloud") params.set(PARAM.groupBy, state.groupBy);
  if (state.selectedComponent)
    params.set(PARAM.component, state.selectedComponent);
  if (state.redOnlyFilter) params.set(PARAM.redOnly, "1");
  if (state.searchFilter) params.set(PARAM.search, state.searchFilter);

  return params;
}

/** Hydrate store from current URL search params. Call before first render. */
export function hydrateFromURL(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.toString() === "") return false;

  const update: Partial<ComponentReadinessState> = {};
  let hydrated = false;

  // View
  const view = params.get(PARAM.view);
  if (view) {
    update.view = view;
    hydrated = true;
  }

  // Releases
  const baseRelease = params.get(PARAM.baseRelease);
  if (baseRelease) {
    update.baseRelease = {
      release: baseRelease,
      start: params.get(PARAM.baseStartTime) ?? undefined,
      end: params.get(PARAM.baseEndTime) ?? undefined,
    };
    hydrated = true;
  }

  const sampleRelease = params.get(PARAM.sampleRelease);
  if (sampleRelease) {
    update.sampleRelease = {
      release: sampleRelease,
      start: params.get(PARAM.sampleStartTime) ?? undefined,
      end: params.get(PARAM.sampleEndTime) ?? undefined,
    };
    hydrated = true;
  }

  // Variant options
  const columnGroupBy = params.get(PARAM.columnGroupBy);
  if (columnGroupBy) {
    update.columnGroupBy = columnGroupBy.split(",").filter(Boolean);
    hydrated = true;
  }

  const dbGroupBy = params.get(PARAM.dbGroupBy);
  if (dbGroupBy) {
    update.dbGroupBy = dbGroupBy.split(",").filter(Boolean);
    hydrated = true;
  }

  // includeVariant: repeated param, format Key:Value
  const includeVariants = params.getAll(PARAM.includeVariant);
  if (includeVariants.length > 0) {
    const variants: Record<string, string[]> = {};
    for (const entry of includeVariants) {
      const idx = entry.indexOf(":");
      if (idx > 0) {
        const key = entry.slice(0, idx);
        const value = entry.slice(idx + 1);
        if (!variants[key]) variants[key] = [];
        variants[key].push(value);
      }
    }
    update.includeVariants = variants;
    hydrated = true;
  }

  // Test filters
  const capabilities = params.getAll(PARAM.testCapabilities);
  if (capabilities.length > 0) {
    update.capabilities = capabilities;
    hydrated = true;
  }

  const lifecycles = params.getAll(PARAM.testLifecycles);
  if (lifecycles.length > 0) {
    update.lifecycles = lifecycles;
    hydrated = true;
  }

  // Advanced options
  const confidence = params.get(PARAM.confidence);
  if (confidence) {
    update.confidence = Number(confidence);
    hydrated = true;
  }

  const pity = params.get(PARAM.pity);
  if (pity) {
    update.pityFactor = Number(pity);
    hydrated = true;
  }

  const minFail = params.get(PARAM.minFail);
  if (minFail) {
    update.minimumFailure = Number(minFail);
    hydrated = true;
  }

  const passRateNew = params.get(PARAM.passRateNewTests);
  if (passRateNew) {
    update.passRateRequiredNewTests = Number(passRateNew);
    hydrated = true;
  }

  const passRateAll = params.get(PARAM.passRateAllTests);
  if (passRateAll) {
    update.passRateRequiredAllTests = Number(passRateAll);
    hydrated = true;
  }

  const ignoreMissing = params.get(PARAM.ignoreMissing);
  if (ignoreMissing) {
    update.ignoreMissing = ignoreMissing === "true";
    hydrated = true;
  }

  const ignoreDisruption = params.get(PARAM.ignoreDisruption);
  if (ignoreDisruption) {
    update.ignoreDisruption = ignoreDisruption === "true";
    hydrated = true;
  }

  const flakeAsFailure = params.get(PARAM.flakeAsFailure);
  if (flakeAsFailure) {
    update.flakeAsFailure = flakeAsFailure === "true";
    hydrated = true;
  }

  const includeMulti = params.get(PARAM.includeMultiReleaseAnalysis);
  if (includeMulti) {
    update.includeMultiReleaseAnalysis = includeMulti === "true";
    hydrated = true;
  }

  // Frontend-only params
  const groupBy = params.get(PARAM.groupBy);
  if (groupBy && GROUP_BY_VALUES.includes(groupBy)) {
    update.groupBy = groupBy as ComponentReadinessState["groupBy"];
    hydrated = true;
  }

  const component = params.get(PARAM.component);
  if (component) {
    update.selectedComponent = component;
    hydrated = true;
  }

  if (params.get(PARAM.redOnly) === "1") {
    update.redOnlyFilter = true;
    hydrated = true;
  }

  const search = params.get(PARAM.search);
  if (search) {
    update.searchFilter = search;
    hydrated = true;
  }

  if (hydrated) {
    useComponentReadinessStore.setState(update);
  }

  return hydrated;
}

function syncToURL(state: ComponentReadinessState): void {
  const params = storeToParams(state);
  const search = params.toString();
  const newURL =
    window.location.pathname +
    (search ? `?${search}` : "") +
    window.location.hash;
  window.history.replaceState(null, "", newURL);
}

let unsubscribe: (() => void) | null = null;

/** Start pushing store changes to the URL. Call once at app mount. */
export function initURLSync(): () => void {
  unsubscribe = useComponentReadinessStore.subscribe(() => {
    syncToURL(useComponentReadinessStore.getState());
  });

  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
}
