# Component Readiness v2 - System Design Specification

**Status:** Draft
**Last Updated:** 2026-04-01
**Authors:** Lead Systems Architect (Claude), Stephen Benjamin

---

## 1. Executive Summary

Component Readiness (CR) is Sippy's regression detection module. It compares CI
test results between a **base release** and a **sample release** using Fisher's
exact test and pass-rate thresholds to identify regressions across variant
combinations (e.g., Platform:aws + Network:ovn + Topology:ha).

This spec describes a **full-stack rewrite** of CR — both a clean Go backend API
under `/api/v2/component_readiness/` and a new TypeScript frontend under
`sippy-ng/src/component_readiness_v2/`. Both live alongside the existing code
for incremental validation.

### Goals

- **Clean backend API** — break apart the `ComponentReportGenerator` god object,
  use REST-oriented endpoints, replace SQL string concatenation with a query
  builder, use `errgroup` over manual goroutine orchestration.
- **TypeScript frontend** with Zustand state management and React Query.
- **Flatten navigation** — remove intermediate drill-down pages; replace with
  Grid View -> Square Breakdown View (with flexible grouping).
- **Test Details page** — stays largely the same as today's design.
- **MVP-first development** — each milestone is a checkpoint for review.
- **Comprehensive testing** — unit tests, integration tests, and AI-driven
  end-to-end browser tests with Playwright.

### Non-Goals

- Backward compatibility with old CR URLs (clean break).
- Changes to the views YAML configuration format.
- Changes to the database schema for triage/regression models.

---

## 2. Current Architecture (As-Is)

### 2.1 Frontend

| Aspect | Current State |
|---|---|
| Language | JavaScript (JSX), no TypeScript |
| Type Safety | PropTypes only |
| State Mgmt | React Context (`CompReadyVarsContext`) + `use-query-params` URL sync |
| UI Framework | Material-UI v5 |
| Routing | React Router v6 nested routes |
| File Count | 50+ components in `sippy-ng/src/component_readiness/` |

### 2.2 Navigation (5-Level Drill-Down)

```
Page 1: Main Grid              /component_readiness/main
  -> Click component name
Page 2: Capabilities           /component_readiness/[env_]capabilities
  -> Click capability
Page 3: Tests                  /component_readiness/[env_]capability
  -> Click test cell
Page 4: Test Environments      /component_readiness/[env_]test
  -> Click environment cell
Page 5: Test Details Report    /component_readiness/test_details
```

Pages 2-4 are intermediate aggregation views that add friction. Users almost
always want to see individual test statuses for a given component + variant
combination.

### 2.3 Backend Problems

The backend exploration revealed significant architectural issues:

**God Object:** `ComponentReportGenerator` (1163 lines, 46KB) handles report
orchestration, BigQuery queries, middleware init, statistical analysis, grid
assembly, and variant handling. Comments in the code acknowledge this:
`"TODO: in several of the below functions we instantiate an entire
ComponentReportGenerator to fetch some small piece of data."`

**SQL String Concatenation:** Query generators build BigQuery SQL via string
concatenation with manual parameter binding. `formatStringSliceForBigQuery`
manually quotes strings. Some filters use `fmt.Sprintf` without parameterization.

**Manual Concurrency:** `getTestStatusFromBigQuery` uses raw `sync.WaitGroup` +
channels with manual goroutine orchestration (90+ lines). Comments flag unused
channels: `"TODO: not hooked up yet"`.

**Middleware Mutation:** Middleware layers directly mutate `testStats` objects
rather than returning new values. No dependency ordering between middleware.
ReleaseFallback has special-case logic for test details that bypasses the
normal middleware path with a comment: `"This is unfortunate compromise"`.

**Type Design Issues:**
- `Release` struct overloaded for 3 modes (named release, PR, payload).
- Test identification uses JSON-serialized strings as map keys.
- `TestIDOptions` is a slice when callers almost always use index `[0]`.
- `RequestOptions` is a flat struct with 15+ fields.

**Query-Param-Heavy API:** All request parameters are loose query strings with
no REST resource orientation. View-based vs freeform parameter duality makes
the API surface large and confusing.

### 2.4 What Works Well (Preserve)

- **Statistical algorithms** — Fisher's Exact test, pass rate comparison,
  severity classification. Correct and well-tested.
- **Regression tracking logic** — matching tests to regressions, hysteresis
  (5-day window), confidence adjustments. Sound algorithm.
- **Intentional regression allowances** — core lookup and adjustment logic.
- **BigQuery deduplication CTE** — handles retries, flakes, duplicates properly.
- **Views YAML system** — server-side presets work well for standardization.
- **Triage/regression database models** — schema is clean and sufficient.
- **Cache framework** — `GetDataFromCacheOrGenerate` pattern is reusable.

---

## 3. Target Architecture (To-Be)

### 3.1 Technology Stack

| Layer | Technology |
|---|---|
| Backend Language | Go (rewritten, clean packages) |
| Backend API Style | RESTish with HATEOAS links |
| Frontend Language | TypeScript (strict mode) |
| State Management | Zustand with URL sync middleware |
| UI Framework | Material-UI v5 |
| Data Fetching | React Query (TanStack Query) |
| Unit Testing | Go `testing` + Vitest + React Testing Library |
| Integration Testing | Playwright + AI-driven test agent |

### 3.2 Backend v2 API

#### 3.2.1 Endpoints

```
GET  /api/v2/component_readiness/views
     List all configured views.

GET  /api/v2/component_readiness/views/{viewName}/report
     Generate component report for a named view.
     Query params: overrides only (e.g., ?redOnly=true)

GET  /api/v2/component_readiness/report
     Generate component report with explicit parameters.
     Query params: baseRelease, sampleRelease, variants, etc.

GET  /api/v2/component_readiness/report/tests
     Get all tests for a specific component + variant combination.
     Query params: component, variant filters, same base/sample params.

GET  /api/v2/component_readiness/tests/{testId}/details
     Test details report for a specific test.
     Query params: base/sample release params, variant filters.

GET  /api/v2/component_readiness/variants
     List available variant dimensions and their values.

# Triage & Regression (same REST patterns, v2 prefix)
GET    /api/v2/component_readiness/regressions
GET    /api/v2/component_readiness/regressions/{id}
GET    /api/v2/component_readiness/regressions/{id}/matches
GET    /api/v2/component_readiness/triages
POST   /api/v2/component_readiness/triages
GET    /api/v2/component_readiness/triages/{id}
PUT    /api/v2/component_readiness/triages/{id}
DELETE /api/v2/component_readiness/triages/{id}
GET    /api/v2/component_readiness/triages/{id}/matches
GET    /api/v2/component_readiness/triages/{id}/audit
POST   /api/v2/component_readiness/bugs
```

Key changes from v1:
- `/views/{viewName}/report` — view-first approach, no parameter ambiguity.
- `/report/tests` — dedicated endpoint for square breakdown data instead of
  reusing the main report endpoint with component filter.
- `/tests/{testId}/details` — resource-oriented test details.
- All responses include HATEOAS `_links` for discoverability.

#### 3.2.2 Backend Package Structure

```
pkg/api/componentreadiness/v2/
  handler.go              - HTTP handlers (thin, delegate to services)
  routes.go               - Route registration

  report/
    service.go            - Report generation orchestrator
    grid.go               - Row/column grid assembly
    analyzer.go           - Statistical analysis (Fisher's, pass rate)
    analyzer_test.go      - Unit tests for analysis logic

  query/
    builder.go            - BigQuery query builder (structured, not string concat)
    builder_test.go       - Query builder tests
    base.go               - Base release query generator
    sample.go             - Sample release query generator
    testdetails.go        - Test details query generator
    result.go             - Result deserialization

  middleware/
    interface.go          - Middleware interface (immutable transforms)
    pipeline.go           - Ordered pipeline with dependency resolution
    releasefallback.go    - Release fallback middleware
    regressiontracker.go  - Regression tracking middleware
    allowances.go         - Intentional regression allowances
    links.go              - HATEOAS link injection

  variants/
    variants.go           - Variant handling, expansion, grouping
    variants_test.go

  types/
    report.go             - ComponentReport, ReportRow, ReportColumn
    status.go             - Status codes enum
    request.go            - Request types (separate structs per mode)
    test.go               - Test identification (structured, not JSON string)
    release.go            - Release types (union: Named | PR | Payload)
```

#### 3.2.3 Key Backend Design Changes

**Break Apart the God Object:**

```go
// Before: one struct does everything
type ComponentReportGenerator struct { /* 1163 lines */ }

// After: focused services with explicit dependencies
type ReportService struct {
    queryBuilder  *query.Builder
    analyzer      *report.Analyzer
    gridAssembler *report.GridAssembler
    middleware    middleware.Pipeline
    cache         cache.Client
}

type Analyzer struct {
    // Pure functions for statistical analysis
}

type GridAssembler struct {
    // Grid construction from analyzed results
}
```

**Immutable Middleware:**

```go
// Before: middleware mutates testStats in place
type Middleware interface {
    PreAnalysis(testKey, testStats)   // mutates testStats
    PostAnalysis(testKey, testStats)  // mutates testStats
}

// After: middleware returns new values
type Middleware interface {
    AdjustPreAnalysis(ctx context.Context, key TestKey, stats TestStats) TestStats
    AdjustPostAnalysis(ctx context.Context, key TestKey, result AnalysisResult) AnalysisResult
    Priority() int  // explicit ordering
}
```

**Structured Query Building:**

```go
// Before: string concatenation
query := "SELECT " + columns + " FROM " + table + " WHERE " + conditions

// After: builder pattern
q := query.New(client).
    WithBaseRelease(baseRelease).
    WithSampleRelease(sampleRelease).
    WithVariants(variants).
    WithTestFilters(filters).
    Build()
```

**errgroup over Manual Goroutines:**

```go
// Before: manual WaitGroup + channels (90 lines)
var wg sync.WaitGroup
baseStatusCh := make(chan map[string]TestStatus)
// ...

// After: errgroup
g, ctx := errgroup.WithContext(ctx)
var baseStatus, sampleStatus map[string]TestStatus

g.Go(func() error {
    var err error
    baseStatus, err = loader.LoadBaseStatus(ctx)
    return err
})
g.Go(func() error {
    var err error
    sampleStatus, err = loader.LoadSampleStatus(ctx)
    return err
})
if err := g.Wait(); err != nil {
    return nil, err
}
```

**Clean Request Types:**

```go
// Before: one overloaded Release struct
type Release struct {
    Name string
    PullRequestOptions *PullRequest  // nil unless PR mode
    PayloadOptions *Payload          // nil unless payload mode
    Start, End time.Time
}

// After: explicit union
type ReleaseSource interface {
    releaseSource()
}
type NamedRelease struct {
    Name  string
    Start time.Time
    End   time.Time
}
type PRRelease struct {
    Org, Repo string
    PRNumber  int
}
type PayloadRelease struct {
    Tags []string
}
```

### 3.3 Frontend Architecture

#### 3.3.1 Navigation Model

```
Page 1: Grid View              /component_readiness/v2/
  -> Click any cell (square)
Page 2: Square Breakdown       /component_readiness/v2/breakdown
  -> Click test name
Page 3: Test Details           /component_readiness/v2/tests/:testId
  -> (stays similar to current test_details page)

Separate pages:
  /component_readiness/v2/triages           Triage list
  /component_readiness/v2/triages/:id       Triage detail
  /component_readiness/v2/help              Help page
```

#### 3.3.2 Grid View (`/component_readiness/v2/`)

Retained with refinements:

- **Rows:** Components
- **Columns:** Variant combinations from `column_group_by`
- **Cells:** Colored squares with severity icons and regressed test counts
- **Sidebar:** View picker, release selector, variant filters, advanced options
- **Toolbar:** Search, red-only filter, accessibility mode toggle

#### 3.3.3 Square Breakdown View (`/component_readiness/v2/breakdown`)

**Replaces Pages 2-4.** Shows all tests for a selected component + variant
combination — or all environments if no specific variant is selected.

**Flexible Grouping:**
- **Group by Capability** — collapsible sections per capability, each showing
  its tests sorted by severity. Default mode.
- **Group by Variant** — when viewing all environments for a component, group
  tests by variant combination.
- **Flat List** — no grouping, pure severity sort. Useful for searching.

The same page handles:
- Single square (component + specific variant combo) — shows tests for that cell.
- Component row click (no variant selected) — shows tests across all variants,
  grouped by variant.

**URL parameters:**
- `component` — selected component name
- `view` — view name (optional, inherits from grid)
- Variant params (e.g., `Platform=aws&Network=ovn`) — when viewing a specific
  square. Omit for all-environments view.
- `groupBy` — `capability` (default), `variant`, or `none`

**Layout:**

```
+--------------------------------------------------------------+
| Breadcrumb: Grid > {Component} [> {Variant Combo}]           |
| Group by: [Capability] [Variant] [None]  [Search...]         |
| Filter: [Status ▼] [Capability ▼]                           |
+--------------------------------------------------------------+
| ▼ Capability: API (2 regressions, 15 passing)                |
|   Test Name                     | Status  | Actions          |
|   [sig-api] should serve APIs   | RED     | [Triage] [Detail]|
|   [sig-api] webhook admission   | GREEN   | -                |
| ▼ Capability: Networking (1 regression, 8 passing)           |
|   [sig-net] pod connectivity    | ORANGE  | [Triage] [Detail]|
|   [sig-net] service endpoints   | GREEN   | -                |
+--------------------------------------------------------------+
```

#### 3.3.4 Test Details Page (`/component_readiness/v2/tests/:testId`)

Stays **largely the same** as the current `test_details` page. This is a
dedicated page (not inline expansion) showing:

- Base vs sample pass rate comparison
- Fisher's exact test p-value and confidence
- Per-job-run results table (pass/fail/flake per prow job)
- Job run links to Prow artifacts
- Triage history and linked bugs
- Regression timeline (opened, last failure, closed)

#### 3.3.5 State Management (Zustand)

```typescript
interface ComponentReadinessStore {
  // View & Release
  view: string | null;
  baseRelease: ReleaseConfig;
  sampleRelease: ReleaseConfig;

  // Variants
  columnGroupBy: string[];
  dbGroupBy: string[];
  includeVariants: Record<string, string[]>;
  compareVariants: Record<string, string[]>;
  variantCrossCompare: string[];

  // Advanced Options
  confidence: number;
  pityFactor: number;
  minimumFailure: number;
  ignoreMissing: boolean;
  ignoreDisruption: boolean;
  flakeAsFailure: boolean;
  includeMultiReleaseAnalysis: boolean;
  passRateRequiredNewTests: number;
  passRateRequiredAllTests: number;

  // Navigation State
  selectedComponent: string | null;
  selectedVariants: Record<string, string> | null;
  groupBy: 'capability' | 'variant' | 'none';

  // UI State
  redOnlyFilter: boolean;
  searchFilter: string;
  statusFilter: number[];
  capabilityFilter: string[];

  // Actions
  setView: (viewName: string) => void;
  applyViewConfig: (config: ViewConfig) => void;
  selectSquare: (component: string, variants: Record<string, string>) => void;
  selectComponent: (component: string) => void;
  clearSelection: () => void;
  setGroupBy: (groupBy: 'capability' | 'variant' | 'none') => void;
}
```

URL sync: serialize store state to URL query params. No backward compatibility
with v1 URLs needed.

#### 3.3.6 Data Fetching (React Query)

```typescript
// Grid data
useQuery(['v2', 'report', filters], () => fetchReport(filters));

// Square breakdown
useQuery(['v2', 'report', 'tests', component, variants, filters],
  () => fetchReportTests(component, variants, filters));

// Test details
useQuery(['v2', 'tests', testId, 'details', filters],
  () => fetchTestDetails(testId, filters));

// Views (rarely changes)
useQuery(['v2', 'views'], fetchViews, { staleTime: Infinity });

// Variants
useQuery(['v2', 'variants'], fetchVariants, { staleTime: 300_000 });
```

### 3.4 Frontend File Structure

```
sippy-ng/src/component_readiness_v2/
  index.ts
  routes.tsx

  types/
    api.ts            - API response types
    status.ts         - Status codes enum
    store.ts          - Store types
    variants.ts       - Variant types
    views.ts          - View config types
    triage.ts         - Triage/regression types

  store/
    store.ts          - Zustand store
    urlSync.ts        - URL sync middleware
    selectors.ts      - Derived selectors

  hooks/
    useReport.ts      - Grid report fetching
    useReportTests.ts - Square breakdown fetching
    useTestDetails.ts - Test details fetching
    useViews.ts       - Views fetching
    useVariants.ts    - Variants fetching
    useTriages.ts     - Triage CRUD

  components/
    GridView/
      GridView.tsx
      GridRow.tsx
      GridCell.tsx
      GridToolbar.tsx
      ColumnHeaders.tsx

    SquareBreakdown/
      SquareBreakdownView.tsx
      TestGroup.tsx         - Collapsible capability/variant group
      TestRow.tsx
      BreakdownFilters.tsx
      BreakdownBreadcrumb.tsx

    TestDetails/
      TestDetailsPage.tsx
      JobRunTable.tsx
      StatsComparison.tsx
      RegressionTimeline.tsx

    Sidebar/
      Sidebar.tsx
      ViewPicker.tsx
      ReleaseSelector.tsx
      VariantFilters.tsx
      AdvancedOptions.tsx
      GroupByOptions.tsx

    Triage/
      TriageList.tsx
      TriageDetail.tsx
      TriageModal.tsx
      RegressionMatches.tsx

    shared/
      StatusIcon.tsx
      LoadingState.tsx
      ErrorState.tsx
      CopyPageURL.tsx
      WarningsBanner.tsx

  utils/
    api.ts
    statusHelpers.ts
    variantHelpers.ts
```

---

## 4. Testing Strategy

### 4.1 Testing Pyramid

```
         /  E2E (AI-Driven)  \        <- Playwright + AI agent
        /  Integration Tests   \      <- API + rendered component tests
       /    Unit Tests           \    <- Pure logic, no I/O
      /______________________________\
```

### 4.2 Backend Unit Tests

Every new Go package gets `_test.go` files covering its public interface.

**Critical coverage areas:**

| Package | What to Test |
|---|---|
| `report/analyzer.go` | Fisher's Exact test, pass rate comparison, severity classification, pity factor, minimum failures. Table-driven tests with known inputs/outputs. |
| `report/grid.go` | Row/column assembly, cell status aggregation, sorting. |
| `query/builder.go` | Generated SQL correctness. Verify parameterized queries match expected SQL. |
| `middleware/*.go` | Each middleware tested in isolation: given input stats, verify output stats. No mutation of inputs. |
| `variants/` | Variant expansion, grouping, cross-comparison logic. |
| `types/status.go` | Status ordering, severity helpers. |

**Backend test tooling:** Standard Go `testing` package + `testify/assert`.

### 4.3 Frontend Unit Tests

**Tooling:** Vitest + React Testing Library

| Area | What to Test |
|---|---|
| Zustand store | Actions produce correct state transitions. URL sync serializes/deserializes correctly. View application populates all fields. |
| React Query hooks | Mock API responses. Verify correct query keys, caching behavior, error handling. |
| Status helpers | Status code ordering, icon mapping, color mapping, accessibility labels. |
| Variant helpers | Parsing variant strings, building query params, grouping logic. |
| Components | Render with mock data. Verify GridCell click dispatches correct action. Verify BreakdownFilters narrow the list. Verify TestGroup collapses/expands. |

### 4.4 Integration Tests

**Backend:** Test the full HTTP handler -> service -> BigQuery mock -> response
pipeline. Use a BigQuery emulator or recorded responses.

**Frontend:** Render full page components with mocked API responses via MSW
(Mock Service Worker). Verify:
- Grid renders correct number of rows/columns from mock data.
- Clicking a cell navigates to breakdown with correct params.
- Breakdown sorts tests by severity.
- Triage modal submits correct API request.

### 4.5 AI-Driven End-to-End Tests (Playwright)

An AI agent drives a real browser against a running Sippy instance to validate
the full user journey. This catches issues that unit/integration tests miss:
rendering glitches, navigation bugs, state persistence across page loads.

**Framework:** Playwright + custom AI test harness

**Architecture:**

```
┌─────────────────────────────┐
│  AI Test Agent              │
│  (Claude or similar LLM)    │
│                             │
│  Given: test scenario in    │
│  natural language           │
│  Does: issues Playwright    │
│  commands, observes results │
│  Judges: pass/fail based    │
│  on visual + DOM state      │
└──────────┬──────────────────┘
           │ controls
           ▼
┌─────────────────────────────┐
│  Playwright Browser         │
│  (Chromium headless)        │
│                             │
│  Navigates Sippy UI         │
│  Takes screenshots          │
│  Reads DOM state            │
│  Reports to AI agent        │
└──────────┬──────────────────┘
           │ hits
           ▼
┌─────────────────────────────┐
│  Sippy Dev Server           │
│  (local or CI)              │
│                             │
│  Serves frontend + API      │
│  Can use mock or real data  │
└─────────────────────────────┘
```

**Test Scenarios (natural language specs):**

```yaml
scenarios:
  - name: "Grid loads and displays data"
    steps: |
      Navigate to the Component Readiness v2 page.
      Verify the grid renders with at least 5 component rows.
      Verify there are colored status cells (not all empty).
      Verify the sidebar shows a view picker and release selector.

  - name: "Square click navigates to breakdown"
    steps: |
      Navigate to the grid view.
      Find a red (regressed) cell and click it.
      Verify the breakdown page loads with the correct component in the breadcrumb.
      Verify tests are listed and sorted with regressions at the top.
      Verify at least one test shows a red status icon.

  - name: "Breakdown grouping works"
    steps: |
      Navigate to a breakdown page with multiple capabilities.
      Verify tests are grouped by capability by default.
      Click the "None" grouping option.
      Verify tests are now in a flat list sorted by severity.
      Click "Capability" grouping option.
      Verify grouping is restored.

  - name: "Test details page shows statistics"
    steps: |
      Navigate to a breakdown page.
      Click the "Detail" link on any test.
      Verify the test details page shows base and sample pass rates.
      Verify there is a job runs table.

  - name: "Triage flow works end-to-end"
    steps: |
      Navigate to a breakdown page with a regressed test.
      Click the "Triage" button on a red test.
      Verify the triage modal opens with the test name pre-filled.
      Fill in a Jira URL and select type "product".
      Submit the triage.
      Verify the test now shows a triaged status icon.

  - name: "View switching updates grid"
    steps: |
      Navigate to the grid view.
      Note the current view name and grid contents.
      Select a different view from the view picker.
      Verify the grid updates with different data.
      Verify the URL updates with the new view name.

  - name: "URL sharing preserves state"
    steps: |
      Navigate to a breakdown page with filters applied.
      Copy the current URL.
      Open a new tab and paste the URL.
      Verify the same component, variants, and filters are active.
```

**Implementation plan:**

```
e2e/
  playwright.config.ts        - Playwright config
  ai-harness.ts               - AI agent integration (sends scenarios,
                                receives Playwright commands)
  scenarios/
    grid.yaml                 - Grid view scenarios
    breakdown.yaml            - Square breakdown scenarios
    triage.yaml               - Triage flow scenarios
    navigation.yaml           - Navigation and URL scenarios
  helpers/
    selectors.ts              - Common DOM selectors
    fixtures.ts               - Test data setup
    screenshots.ts            - Screenshot capture utilities
```

The AI harness can start simple (scripted Playwright tests that validate
DOM state) and evolve toward full AI-driven exploration where the agent
decides what to click and what to verify.

---

## 5. MVP Development Plan

### MVP 0: Skeleton & Tooling

**Goal:** Establish build pipeline, verify TypeScript + Zustand + React Query
work in the existing sippy-ng build.

**Deliverables:**
- TypeScript configured in sippy-ng (tsconfig.json, build changes)
- Empty v2 route renders "Component Readiness v2" placeholder
- Zustand store created with a single test field, URL sync working
- React Query provider configured
- One Playwright test verifying the placeholder page loads
- Backend: empty `/api/v2/component_readiness/views` endpoint returns
  existing views data (thin wrapper over existing view loader)

**Checkpoint:** Verify build works, routing works, store syncs to URL.

### MVP 1: Grid View

**Goal:** Render the main CR grid using v2 backend endpoints. All core
primitives (types, store, hooks, status rendering) must be solid.

**Deliverables:**
- Backend: `/api/v2/component_readiness/views/{viewName}/report` endpoint
  Returns same data shape as v1 but through clean new code path.
- Backend: `/api/v2/component_readiness/variants` endpoint
- Frontend: Full type definitions for all API responses
- Frontend: Zustand store with all state slices + URL sync
- Frontend: React Query hooks for report and variants
- Frontend: Grid view with rows, columns, colored cells, severity icons
- Frontend: Sidebar with view picker, release selector, variant filters
- Frontend: Toolbar with search and red-only filter
- Unit tests for: analyzer, grid assembly, status helpers, store actions
- Playwright test: grid loads and displays data

**Checkpoint: STOP HERE FOR REVIEW.** Validate that the grid renders correctly,
primitives are right, types are clean, before building breakdown view.

### MVP 2: Square Breakdown

**Goal:** Clicking a square navigates to the breakdown view showing all tests.

**Deliverables:**
- Backend: `/api/v2/component_readiness/report/tests` endpoint
- Frontend: Square Breakdown page with test list
- Frontend: Grouping by capability (collapsible sections)
- Frontend: Severity-sorted test list within groups
- Frontend: Status and capability filters
- Frontend: Component-only view (all environments, grouped by variant)
- Unit + integration tests for breakdown
- Playwright tests: square click, grouping, filtering

**Checkpoint:** Review breakdown UX, verify grouping modes work.

### MVP 3: Test Details

**Goal:** Test details page with full statistics and job run data.

**Deliverables:**
- Backend: `/api/v2/component_readiness/tests/{testId}/details` endpoint
- Frontend: Test details page (ported from current design)
- Frontend: Job runs table, stats comparison, regression timeline
- Tests for test details
- Playwright test: navigate to details, verify stats displayed

### MVP 4: Triage & Regression

**Goal:** Full triage workflow — create, view, resolve triages on regressions.

**Deliverables:**
- Backend: Triage CRUD endpoints under v2 (reuses existing DB models)
- Backend: Regression listing endpoints under v2
- Frontend: Triage modal, list, detail pages
- Frontend: Inline triage button on breakdown page
- Frontend: Regression matches
- Tests for triage flow
- Playwright test: full triage e2e

### MVP 5: Polish & Cutover

**Goal:** Feature parity, performance, accessibility, and production readiness.

**Deliverables:**
- Cross-variant comparison views
- Accessibility mode (non-color indicators)
- Virtual scrolling for large test lists
- Help page
- Cache priming for v2 endpoints
- Full AI-driven e2e test suite
- Remove old code after validation

---

## 6. Key Design Decisions

### 6.1 Why Rewrite the Backend?

The current `ComponentReportGenerator` is a 1163-line god object that mixes
HTTP parsing, BigQuery orchestration, statistical analysis, grid assembly,
and middleware management. The code itself acknowledges this with TODO comments.
SQL is built via string concatenation. Concurrency uses manual WaitGroup +
channels. These issues make the code hard to test, extend, and debug.

A v2 backend with focused packages allows:
- Unit testing of statistical analysis without BigQuery.
- Query builder tests that verify SQL without execution.
- Middleware tests in isolation with immutable transforms.
- Clean separation of concerns for maintainability.

### 6.2 Why Flatten Navigation?

Pages 2-4 are click-through aggregation views. The breakdown view provides the
same information in a single, filterable, groupable list. Flexible grouping by
capability or variant replaces the rigid drill-down hierarchy.

### 6.3 Why Keep Test Details as a Separate Page?

The test details page shows per-job-run data which is a fundamentally different
view from the test list. It has its own data fetching, its own table layout, and
enough content to warrant a full page rather than an inline expansion.

### 6.4 Why AI-Driven E2E Tests?

Traditional Playwright tests are brittle — they break when selectors change.
An AI-driven approach describes *what* to verify in natural language and lets
the AI agent figure out *how* to interact with the page. This produces more
resilient tests that catch real UX issues rather than CSS selector mismatches.

### 6.5 Why MVP-First?

CR is complex. Building everything at once risks discovering fundamental
issues late. The MVP approach ensures each layer is solid before building on
top of it. The explicit checkpoint after MVP 1 (Grid View) catches type
design, state management, and rendering issues early.

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Backend rewrite scope creep | Strict package boundaries. Reuse statistical algorithms and DB models from v1. |
| Frontend/backend integration mismatches | Shared TypeScript types generated from Go structs. Integration tests with MSW. |
| Performance regression in v2 backend | Cache priming (MVP 5). Benchmark v1 vs v2 response times. |
| AI E2E tests unreliable in CI | Start with scripted Playwright fallback. AI tests run as optional CI job. |
| MVP 1 takes too long | Focus on grid rendering only. Sidebar can use hardcoded view initially. |
| Loss of existing features | Feature audit checklist maintained in Kanban. Each MVP has acceptance criteria. |
