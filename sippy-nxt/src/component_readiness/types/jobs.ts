// Types for the view jobs API - shows which CI jobs contribute to a view

export interface JobRunStats {
  job_name: string
  total_runs: number
  successful_runs: number
  pass_rate: number // 0–100
}

export interface NormalizedJob {
  normalized_name: string
  variants: Record<string, string>
  sample?: JobRunStats
  basis?: JobRunStats
}

export interface ViewJobsResponse {
  sample_release: string
  basis_release: string
  sample_period: { start: string; end: string }
  basis_period: { start: string; end: string }
  jobs: NormalizedJob[]
}

export interface ExclusionReason {
  variant: string
  job_value: string
  filter_values: string[]
}

export interface JobDiagnosis {
  job_name: string
  included: boolean
  variants: Record<string, string>
  exclusion_reasons: ExclusionReason[]
}
