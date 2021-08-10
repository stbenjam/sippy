package v1

import (
	bugsv1 "github.com/openshift/sippy/pkg/apis/bugs/v1"
)

// PassRate describes statistics on a pass rate
type PassRate struct {
	Percentage          float64 `json:"percentage"`
	ProjectedPercentage float64 `json:"projectedPercentage,omitempty"`
	Runs                int     `json:"runs"`
}

// SummaryAcrossAllJobs describes the category summaryacrossalljobs
// valid keys are latest and prev
type SummaryAcrossAllJobs struct {
	TestExecutions     map[string]int     `json:"testExecutions"`
	TestPassPercentage map[string]float64 `json:"testPassPercentage"`
}

// FailureGroups describes the category failuregroups
// valid keys are latest and prev
type FailureGroups struct {
	JobRunsWithFailureGroup map[string]int `json:"jobRunsWithFailureGroup"`
	AvgFailureGroupSize     map[string]int `json:"avgFailureGroupSize"`
	MedianFailureGroupSize  map[string]int `json:"medianFailureGroupSize"`
}

// CanaryTestFailInstance describes one single instance of a canary test failure
// passRate should have percentage (float64) and number of runs (int)
type CanaryTestFailInstance struct {
	Name     string   `json:"name"`
	URL      string   `json:"url"`
	PassRate PassRate `json:"passRate"`
}

// PassRatesByJobName is responsible for the section job pass rates by job name
type PassRatesByJobName struct {
	Name      string              `json:"name"`
	URL       string              `json:"url"`
	PassRates map[string]PassRate `json:"passRates"`
}

// MinimumPassRatesByComponent describes minimum job pass rate per BZ component
type MinimumPassRatesByComponent struct {
	// name is the component name
	Name string `json:"name"`
	// passRates are the pass rates, by "latest" and optional "prev".
	PassRates map[string]PassRate `json:"passRates"`
}

// FailingTestBug describes a single instance of failed test with bug or failed test without bug
// differs from failingtest in that it includes pass rates for previous days and latest days
type FailingTestBug struct {
	Name      string              `json:"name"`
	URL       string              `json:"url"`
	PassRates map[string]PassRate `json:"passRates"`
	Bugs      []bugsv1.Bug        `json:"bugs,omitempty"`
	// AssociatedBugs are bugs that match the test/job, but do not match the target release
	AssociatedBugs []bugsv1.Bug `json:"associatedBugs,omitempty"`
}

// JobSummaryVariant describes a single variant and its associated jobs, their pass rates, and failing tests
type JobSummaryVariant struct {
	Variant   string              `json:"platform"`
	PassRates map[string]PassRate `json:"passRates"`
}

// FailureGroup describes a single failure group - does not show the associated failed job names
type FailureGroup struct {
	Job          string `json:"job"`
	URL          string `json:"url"`
	TestFailures int    `json:"testFailures"`
}

// Test contains the full accounting of a test's history, with a synthetic ID. The format
// of this struct is suitable for use in a data table.
type Test struct {
	ID   int    `json:"id"`
	Name string `json:"name"`

	CurrentSuccesses      int     `json:"current_successes"`
	CurrentFailures       int     `json:"current_failures"`
	CurrentFlakes         int     `json:"current_flakes"`
	CurrentPassPercentage float64 `json:"current_pass_percentage"`
	CurrentRuns           int     `json:"current_runs"`

	PreviousSuccesses      int     `json:"previous_successes"`
	PreviousFailures       int     `json:"previous_failures"`
	PreviousFlakes         int     `json:"previous_flakes"`
	PreviousPassPercentage float64 `json:"previous_pass_percentage"`
	PreviousRuns           int     `json:"previous_runs"`
	NetImprovement         float64 `json:"net_improvement"`

	Bugs           []bugsv1.Bug `json:"bugs"`
	AssociatedBugs []bugsv1.Bug `json:"associated_bugs"`
}

// Job contains the full accounting of a job's history, with a synthetic ID. The format of
// this struct is suitable for use in a data table.
type Job struct {
	ID        int      `json:"id"`
	Name      string   `json:"name"`
	BriefName string   `json:"brief_name"`
	Variants  []string `json:"variants"`

	CurrentPassPercentage          float64 `json:"current_pass_percentage"`
	CurrentProjectedPassPercentage float64 `json:"current_projected_pass_percentage"`
	CurrentRuns                    int     `json:"current_runs"`

	PreviousPassPercentage          float64 `json:"previous_pass_percentage"`
	PreviousProjectedPassPercentage float64 `json:"previous_projected_pass_percentage"`
	PreviousRuns                    int     `json:"previous_runs"`
	NetImprovement                  float64 `json:"net_improvement"`

	TestGridURL    string       `json:"test_grid_url"`
	Bugs           []bugsv1.Bug `json:"bugs"`
	AssociatedBugs []bugsv1.Bug `json:"associated_bugs"`
}
