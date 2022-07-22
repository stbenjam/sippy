package models

import "time"

type BuildClusterHealthReport struct {
	CurrentPassPercentage float64 `json:"current_pass_percentage"`
	CurrentRuns           int     `json:"current_runs"`
	CurrentPasses         int     `json:"current_passes,omitempty"`
	CurrentFails          int     `json:"current_fails,omitempty"`

	PreviousPassPercentage float64 `json:"previous_pass_percentage"`
	PreviousRuns           int     `json:"previous_runs"`
	PreviousPasses         int     `json:"previous_passes,omitempty"`
	PreviousFails          int     `json:"previous_fails,omitempty"`

	NetImprovement float64 `json:"net_improvement"`
}

type BuildClusterHealth struct {
	Cluster               string    `json:"cluster"`
	Period                time.Time `json:"period"`
	TotalRuns             int       `json:"total_runs"`
	Passes                int       `json:"passes"`
	Failures              int       `json:"failures"`
	CurrentPassPercentage float64   `json:"current_pass_percentage"`
	MeanSuccess           float64   `json:"mean_success"`
	Difference            float64   `json:"difference"`
}
