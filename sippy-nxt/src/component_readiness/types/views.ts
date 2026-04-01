// View types mirroring pkg/apis/api/componentreport/crview/types.go
// and pkg/apis/api/componentreport/reqopts/types.go

import type { Link } from './api'

export interface Release {
  release: string
  start?: string
  end?: string
  pull_request_options?: PullRequest
  payload_options?: Payload
}

export interface RelativeRelease extends Release {
  relative_start?: string
  relative_end?: string
}

export interface PullRequest {
  org: string
  repo: string
  pr_number: string
}

export interface Payload {
  tags: string[]
}

export interface VariantOptions {
  column_group_by: string[]
  db_group_by: string[]
  include_variants: Record<string, string[]>
  compare_variants?: Record<string, string[]>
  variant_cross_compare?: string[]
}

export interface AdvancedOptions {
  minimum_failure: number
  confidence: number
  pity_factor: number
  pass_rate_required_new_tests: number
  pass_rate_required_all_tests: number
  ignore_missing: boolean
  ignore_disruption: boolean
  flake_as_failure: boolean
  include_multi_release_analysis: boolean
  key_test_names?: string[]
}

export interface TestFilters {
  capabilities?: string[]
  lifecycles?: string[]
}

export interface TestIdentification {
  component?: string
  capability?: string
  test_id?: string
  requested_variants?: Record<string, string>
  base_override_release?: string
}

export interface View {
  name: string
  base_release: RelativeRelease
  sample_release: RelativeRelease
  test_id_options: TestIdentification
  test_filters: TestFilters
  variant_options: VariantOptions
  advanced_options: AdvancedOptions
}

// V2 API response types with HATEOAS links
export interface ViewResponse {
  name: string
  base_release: RelativeRelease
  sample_release: RelativeRelease
  test_id_options: TestIdentification
  test_filters: TestFilters
  variant_options: VariantOptions
  advanced_options: AdvancedOptions
  _links: Record<string, Link>
}

export interface ViewsResponse {
  views: ViewResponse[]
  _links: Record<string, Link>
}
