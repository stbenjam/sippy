// API response types mirroring Go structs in pkg/apis/api/componentreport/

import type { Comparison, Status } from './status'

// Mirrors crtest.Stats
export interface Stats {
  success_count: number
  failure_count: number
  flake_count: number
  success_rate: number
}

// Mirrors testdetails.ReleaseStats
export interface ReleaseStats {
  release: string
  start?: string
  end?: string
  success_count: number
  failure_count: number
  flake_count: number
  success_rate: number
}

// Mirrors testdetails.TestComparison
export interface TestComparison {
  status: Status
  comparison: Comparison
  explanations: string[]
  sample_stats: ReleaseStats
  base_stats?: ReleaseStats
  fisher_exact?: number
  last_failure?: string
  regression?: Regression
  links?: Record<string, string>
}

// Mirrors crtest.RowIdentification
export interface RowIdentification {
  component: string
  capability?: string
  test_name?: string
  test_suite?: string
  test_id?: string
}

// Mirrors crtest.ColumnIdentification
export interface ColumnIdentification {
  variants: Record<string, string>
}

// Mirrors crtype.ReportTestSummary
export interface ReportTestSummary extends RowIdentification, TestComparison {}

// Mirrors crtype.ReportColumn
export interface ReportColumn extends ColumnIdentification {
  status: Status
  regressed_tests?: ReportTestSummary[]
}

// Mirrors crtype.ReportRow
export interface ReportRow extends RowIdentification {
  columns: ReportColumn[]
}

// Mirrors crtype.ComponentReport
export interface ComponentReport {
  rows: ReportRow[]
  generated_at?: string
  warnings?: string[]
}

// Mirrors testdetails.JobRunStats
export interface JobRunStats {
  job_url: string
  job_run_id: string
  start_time: string
  test_stats: Stats
}

// Mirrors testdetails.JobStats
export interface JobStats {
  sample_job_name?: string
  base_job_name?: string
  sample_stats: Stats
  base_stats: Stats
  sample_job_run_stats?: JobRunStats[]
  base_job_run_stats?: JobRunStats[]
  significant: boolean
}

// Mirrors testdetails.Analysis
export interface Analysis extends TestComparison {
  job_stats?: JobStats[]
}

// Mirrors testdetails.Report
export interface TestDetailsReport extends RowIdentification {
  jira_component: string
  jira_component_id?: number
  test_name: string
  generated_at?: string
  analyses: Analysis[]
  links?: Record<string, string>
  variants: Record<string, string>
}

// Mirrors crtest.JobVariants
export interface JobVariants {
  variants: Record<string, string[]>
}

// Mirrors models.TestRegression (simplified)
export interface Regression {
  id: number
  view: string
  release: string
  test_id: string
  test_name: string
  component: string
  capability: string
  opened: string
  closed?: string
  last_failure?: string
}

// HATEOAS link
export interface Link {
  href: string
}
