# Component Readiness v2 - Team Composition

## Roles

### Lead Systems Architect (Project Manager)
**Responsibilities:**
- Owns the system design spec and ensures architectural consistency.
- Manages the Kanban board and coordinates MVP checkpoints.
- Reviews all code for architectural compliance.
- Resolves cross-cutting design decisions.
- Coordinates between agents and ensures no conflicts.

### UI/Frontend Engineer (`@ui-engineer`)
**Responsibilities:**
- TypeScript/React/Zustand implementation of all frontend components.
- Zustand store design and URL sync middleware.
- Grid view, Square Breakdown view, Test Details page, Sidebar, Toolbar.
- Routing setup.
- Visual parity with existing grid, then new breakdown UX.
- Performance optimization (virtual scrolling, memoization).

**Key Skills:** TypeScript, React, Zustand, Material-UI, React Router.

### API/Backend Engineer (`@api-engineer`)
**Responsibilities:**
- v2 Go backend: clean package structure, report service, query builder.
- Break apart ComponentReportGenerator into focused services.
- Implement immutable middleware pipeline.
- TypeScript type definitions mirroring new Go structs.
- React Query hooks for all v2 endpoints.
- Cache priming for v2.

**Key Skills:** Go, BigQuery, REST API design, TypeScript (types).

### Product Designer (`@product-designer`)
**Responsibilities:**
- Wireframes for Square Breakdown view (grouping, filtering, actions).
- Status hierarchy and visual language (colors, icons, badges).
- Navigation patterns and breadcrumb design.
- Accessibility compliance (WCAG AA).

**Key Skills:** UI/UX design, accessibility, information hierarchy.

### QA/Validation Engineer (`@qa-engineer`)
**Responsibilities:**
- Unit test suites (Go + Vitest).
- Integration tests (MSW mocks for frontend, mock BigQuery for backend).
- Playwright e2e tests (scripted + AI-driven scenarios).
- Performance benchmarking.
- Accessibility testing.

**Key Skills:** Go testing, Vitest, React Testing Library, Playwright.

## MVP Checkpoint Protocol

After each MVP is complete:
1. QA runs the full test suite (unit + integration + Playwright).
2. Lead Architect reviews code for architectural compliance.
3. Stephen reviews the running UI and provides feedback.
4. Feedback is incorporated before the next MVP begins.
5. Kanban board is updated: completed tasks moved to Done, next MVP
   tasks refined based on learnings.

## Coordination Rules

1. **Atomic Kanban Access:** Only one agent moves a task at a time.
   Tasks are claimed by writing the agent's tag and moving to "In Progress".

2. **MVP Ordering:** Tasks are prefixed with MVP number (M0, M1, M2...).
   No MVP N+1 task starts until MVP N checkpoint is passed.

3. **No Parallel Edits to Same File:** If two agents need the same file,
   they coordinate through the Kanban board.

4. **Backend-Frontend Contract:** API types are defined first (M1-001),
   then backend implements endpoints, then frontend consumes them.
   Type definitions are the contract.
