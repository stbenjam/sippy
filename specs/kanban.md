---

kanban-plugin: basic

---

## Backlog

### MVP 0: Skeleton & Tooling

- [ ] **M0-001**: Configure TypeScript in sippy-ng @ui-engineer
  Add tsconfig.json with strict mode. Update build to handle .ts/.tsx alongside .js/.jsx. Verify existing code still builds.

- [ ] **M0-002**: Install Zustand and React Query @ui-engineer
  Add zustand and @tanstack/react-query. Set up QueryClientProvider. Create skeleton store. Verify basic state works.

- [ ] **M0-003**: Create v2 route with placeholder page @ui-engineer
  Add /component_readiness/v2/ route in App.js. Render placeholder "CR v2" page. Verify routing works.

- [ ] **M0-004**: Create v2 backend route scaffold @api-engineer
  Register /api/v2/component_readiness/ routes in server.go. Implement /views endpoint as thin wrapper over existing view loader. Return JSON with HATEOAS links.

- [ ] **M0-005**: Set up Playwright for e2e testing @qa-engineer
  Install Playwright. Create playwright.config.ts. Write one test: navigate to CR v2 placeholder, verify it renders.

- [ ] **M0-006**: Set up Vitest for frontend unit tests @qa-engineer
  Configure Vitest in sippy-ng. Write one trivial test to verify the pipeline works.

### MVP 1: Grid View (CHECKPOINT - STOP FOR REVIEW)

- [ ] **M1-001**: Define all API response TypeScript types @api-engineer
  types/api.ts, types/status.ts, types/variants.ts, types/views.ts. Mirror Go structs for ComponentReport, ReportRow, ReportColumn, TestComparison, Status enum.

- [ ] **M1-002**: Implement backend ReportService and Analyzer @api-engineer
  pkg/api/componentreadiness/v2/report/service.go and analyzer.go. Extract Fisher's Exact and pass rate logic into testable Analyzer. Table-driven unit tests.

- [ ] **M1-003**: Implement backend QueryBuilder @api-engineer
  pkg/api/componentreadiness/v2/query/builder.go. Structured BigQuery query construction. Parameterized queries. Unit tests verifying generated SQL.

- [ ] **M1-004**: Implement backend GridAssembler @api-engineer
  pkg/api/componentreadiness/v2/report/grid.go. Row/column assembly from analyzed results. Unit tests with mock data.

- [ ] **M1-005**: Implement backend middleware pipeline @api-engineer
  Immutable transforms, explicit ordering. Start with regression tracker and release fallback. Unit tests per middleware.

- [ ] **M1-006**: Wire up /views/{viewName}/report endpoint @api-engineer
  Full request -> service -> query -> analysis -> grid -> response pipeline. Integration test with mock BigQuery data.

- [ ] **M1-007**: Wire up /variants endpoint @api-engineer
  Return available variant dimensions and values.

- [ ] **M1-008**: Implement Zustand store with full state @ui-engineer
  componentReadinessStore.ts with all slices: view, releases, variants, advanced options, navigation, UI state. Unit tests for all actions.

- [ ] **M1-009**: Implement URL sync middleware @ui-engineer
  Bidirectional sync between Zustand store and URL params. Unit tests for serialization/deserialization.

- [ ] **M1-010**: Implement React Query hooks (report, views, variants) @ui-engineer
  useReport.ts, useViews.ts, useVariants.ts. Typed responses. Unit tests with mocked API.

- [ ] **M1-011**: Build GridView page @ui-engineer
  Main grid with MUI Table. Fetch via useReport hook. Render rows/columns/cells. Wire to store.

- [ ] **M1-012**: Build GridCell component @ui-engineer
  Clickable status cell with severity icon and regressed test badge count. On click: dispatch selectSquare to store.

- [ ] **M1-013**: Build StatusIcon component @ui-engineer
  Port CompSeverityIcon to TypeScript. All status codes mapped to icons/colors. Accessibility mode support.

- [ ] **M1-014**: Build Sidebar (ViewPicker, ReleaseSelector, VariantFilters) @ui-engineer
  Sidebar container with view selection, release config, variant checkboxes. All wired to Zustand store.

- [ ] **M1-015**: Build GridToolbar @ui-engineer
  Search filter, red-only toggle, copy URL button, generated-at timestamp.

- [ ] **M1-016**: Unit tests for status helpers, variant helpers, store @qa-engineer
  Comprehensive tests for all utility functions and store actions.

- [ ] **M1-017**: Integration test - grid renders with mock data @qa-engineer
  MSW mock for /report endpoint. Render GridView. Verify rows, columns, cell colors.

- [ ] **M1-018**: Playwright test - grid loads and displays @qa-engineer
  Navigate to CR v2. Verify grid renders with rows and colored cells. Verify sidebar controls present.

- [ ] **M1-019**: Backend unit tests - analyzer, grid, query builder @qa-engineer
  Table-driven tests for Fisher's, pass rate, severity classification. Grid assembly tests. Query builder SQL verification.

### MVP 2: Square Breakdown

- [ ] **M2-001**: Implement /report/tests backend endpoint @api-engineer
  Returns all tests for a component + variant combo. Sorted by severity. Grouped by capability.

- [ ] **M2-002**: Implement useReportTests hook @ui-engineer
  React Query hook for /report/tests. Accept component + variant params from store.

- [ ] **M2-003**: Build SquareBreakdownView page @ui-engineer
  Page with breadcrumb, grouping controls, test list. Fetches via useReportTests.

- [ ] **M2-004**: Build TestGroup component @ui-engineer
  Collapsible section for capability or variant grouping. Shows count badge (regressions / total).

- [ ] **M2-005**: Build TestRow component @ui-engineer
  Test name, capability, status icon, triage button placeholder. Navigates to test details on click.

- [ ] **M2-006**: Build BreakdownFilters @ui-engineer
  Status filter (multi-select), capability filter (dropdown), search. Client-side filtering.

- [ ] **M2-007**: Support all-environments view (component-only click) @ui-engineer
  When no variant selected, show all tests grouped by variant. Wire component row click to store.selectComponent().

- [ ] **M2-008**: Unit tests for breakdown components @qa-engineer
  Render with mock data. Verify sorting, grouping, filtering.

- [ ] **M2-009**: Playwright tests - breakdown navigation and grouping @qa-engineer
  Click square -> verify breakdown loads. Toggle grouping modes. Apply filters. Verify URL state.

### MVP 3: Test Details

- [ ] **M3-001**: Implement /tests/{testId}/details backend endpoint @api-engineer
  Test details with per-job-run data. Clean reimplementation of test_details.go logic.

- [ ] **M3-002**: Implement useTestDetails hook @ui-engineer
  React Query hook for test details endpoint.

- [ ] **M3-003**: Build TestDetailsPage @ui-engineer
  Port current test_details design to TypeScript. Stats comparison, job runs table, regression timeline.

- [ ] **M3-004**: Build JobRunTable component @ui-engineer
  Table of per-job-run pass/fail/flake results with links to Prow artifacts.

- [ ] **M3-005**: Build StatsComparison component @ui-engineer
  Base vs sample pass rates, Fisher p-value, confidence interval display.

- [ ] **M3-006**: Playwright test - test details page @qa-engineer
  Navigate to test details. Verify stats and job runs displayed.

### MVP 4: Triage & Regression

- [ ] **M4-001**: Implement triage CRUD endpoints under v2 @api-engineer
  Reuse existing DB models. HATEOAS links. Clean handlers.

- [ ] **M4-002**: Implement regression endpoints under v2 @api-engineer
  List regressions, get by ID, potential matches.

- [ ] **M4-003**: Implement useTriage hooks @ui-engineer
  React Query mutations for create/update/delete. Invalidate related queries.

- [ ] **M4-004**: Build TriageModal @ui-engineer
  Modal for creating/editing triages. Jira URL validation. Type selector. Regression linking.

- [ ] **M4-005**: Build TriageList and TriageDetail pages @ui-engineer
  List all triages with filtering. Detail page with linked regressions and audit log.

- [ ] **M4-006**: Integrate triage button in breakdown TestRow @ui-engineer
  Triage button on regressed tests opens modal pre-populated with test info.

- [ ] **M4-007**: Playwright test - full triage e2e @qa-engineer
  Navigate to regressed test. Create triage. Verify status changes. View triage list.

### MVP 5: Polish & Cutover

- [ ] **M5-001**: Cross-variant comparison view support @ui-engineer
  Handle variantCrossCompare in store and grid. Comparison columns.

- [ ] **M5-002**: Accessibility mode @ui-engineer
  Non-color status indicators (patterns, text labels). WCAG AA contrast.

- [ ] **M5-003**: Virtual scrolling for large test lists @ui-engineer
  react-window or similar for breakdown views with 100+ tests.

- [ ] **M5-004**: Help page @ui-engineer
  Port and update ComponentReadinessHelp for v2 navigation model.

- [ ] **M5-005**: Cache priming for v2 endpoints @api-engineer
  Adapt crcacheloader to prime v2 report and test detail caches.

- [ ] **M5-006**: AI-driven e2e test suite @qa-engineer
  Full scenario suite: grid, breakdown, test details, triage, view switching, URL sharing.

- [ ] **M5-007**: Performance benchmarking v1 vs v2 @qa-engineer
  Compare response times, render performance, API call counts.

- [ ] **M5-008**: Remove old CR code @ui-engineer
  Delete component_readiness/ directory. Update routing. Clean up unused dependencies.

### Design Tasks

- [ ] **D-001**: Wireframe Square Breakdown layout @product-designer
  Define grouping UX, test row layout, triage action placement. Mobile responsiveness.

- [ ] **D-002**: Define status visual language @product-designer
  Color palette, icon set, badge design for all status codes. Accessibility compliance.

- [ ] **D-003**: Design navigation breadcrumb pattern @product-designer
  Grid -> Breakdown -> Test Details navigation. URL structure for shareability.

## In Progress


## Done

