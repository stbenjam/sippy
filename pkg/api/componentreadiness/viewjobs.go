package componentreadiness

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/openshift/sippy/pkg/api/componentreadiness/dataprovider"
	"github.com/openshift/sippy/pkg/api/componentreadiness/utils"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crtest"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/reqopts"
)

// NormalizedJob groups a sample and basis job by their normalized (release-agnostic) name.
type NormalizedJob struct {
	NormalizedName string                   `json:"normalized_name"`
	Variants       map[string]string        `json:"variants"`
	Sample         *dataprovider.JobRunStats `json:"sample,omitempty"`
	Basis          *dataprovider.JobRunStats `json:"basis,omitempty"`
}

// TimePeriod represents a start/end time range.
type TimePeriod struct {
	Start string `json:"start"`
	End   string `json:"end"`
}

// ViewJobsResponse is the response for the view jobs endpoint.
type ViewJobsResponse struct {
	SampleRelease string          `json:"sample_release"`
	BasisRelease  string          `json:"basis_release"`
	SamplePeriod  TimePeriod      `json:"sample_period"`
	BasisPeriod   TimePeriod      `json:"basis_period"`
	Jobs          []NormalizedJob `json:"jobs"`
}

// ExclusionReason explains why a specific variant caused a job to be excluded.
type ExclusionReason struct {
	Variant      string   `json:"variant"`
	JobValue     string   `json:"job_value"`
	FilterValues []string `json:"filter_values"`
}

// JobDiagnosis explains whether a job is included in a view and why/why not.
type JobDiagnosis struct {
	JobName          string            `json:"job_name"`
	Included         bool              `json:"included"`
	Variants         map[string]string `json:"variants"`
	ExclusionReasons []ExclusionReason `json:"exclusion_reasons"`
}

// releaseVariants are variant keys that differ between releases and should be
// excluded when matching jobs across sample and basis.
var releaseVariants = map[string]bool{
	"Release":          true,
	"ReleaseMajor":     true,
	"ReleaseMinor":     true,
	"FromRelease":      true,
	"FromReleaseMajor": true,
	"FromReleaseMinor": true,
}

// GetViewJobs returns CI jobs contributing to a component readiness report.
func GetViewJobs(
	ctx context.Context,
	provider dataprovider.DataProvider,
	reqOptions reqopts.RequestOptions,
	allJobVariants crtest.JobVariants,
) (*ViewJobsResponse, error) {
	sampleJobs, err := provider.QueryJobRuns(ctx, reqOptions, allJobVariants,
		reqOptions.SampleRelease.Name, reqOptions.SampleRelease.Start, reqOptions.SampleRelease.End)
	if err != nil {
		return nil, fmt.Errorf("error querying sample jobs: %w", err)
	}

	basisJobs, err := provider.QueryJobRuns(ctx, reqOptions, allJobVariants,
		reqOptions.BaseRelease.Name, reqOptions.BaseRelease.Start, reqOptions.BaseRelease.End)
	if err != nil {
		return nil, fmt.Errorf("error querying basis jobs: %w", err)
	}

	allJobNames := collectJobNames(sampleJobs, basisJobs)
	jobVariantMap, err := provider.QueryJobVariantValues(ctx, allJobNames, reqOptions.VariantOption.DBGroupBy.List())
	if err != nil {
		return nil, fmt.Errorf("error querying job variants: %w", err)
	}

	normalizedJobs := buildNormalizedJobs(sampleJobs, basisJobs, jobVariantMap, reqOptions.VariantOption.DBGroupBy.List())

	return &ViewJobsResponse{
		SampleRelease: reqOptions.SampleRelease.Name,
		BasisRelease:  reqOptions.BaseRelease.Name,
		SamplePeriod: TimePeriod{
			Start: reqOptions.SampleRelease.Start.Format("2006-01-02T15:04:05Z"),
			End:   reqOptions.SampleRelease.End.Format("2006-01-02T15:04:05Z"),
		},
		BasisPeriod: TimePeriod{
			Start: reqOptions.BaseRelease.Start.Format("2006-01-02T15:04:05Z"),
			End:   reqOptions.BaseRelease.End.Format("2006-01-02T15:04:05Z"),
		},
		Jobs: normalizedJobs,
	}, nil
}

// DiagnoseJob checks whether a job is included in a component readiness report
// and explains which variant filters caused exclusion.
func DiagnoseJob(
	ctx context.Context,
	provider dataprovider.DataProvider,
	reqOptions reqopts.RequestOptions,
	jobName string,
) (*JobDiagnosis, error) {
	variants, err := provider.LookupJobVariants(ctx, jobName)
	if err != nil {
		return nil, fmt.Errorf("error looking up job variants: %w", err)
	}

	if len(variants) == 0 {
		return &JobDiagnosis{
			JobName:  jobName,
			Included: false,
			Variants: map[string]string{},
			ExclusionReasons: []ExclusionReason{
				{Variant: "unknown", JobValue: "", FilterValues: nil},
			},
		}, nil
	}

	includeVariants := reqOptions.VariantOption.IncludeVariants
	if includeVariants == nil {
		includeVariants = map[string][]string{}
	}

	var exclusions []ExclusionReason
	for variantName, allowedValues := range includeVariants {
		jobValue, exists := variants[variantName]
		if !exists {
			exclusions = append(exclusions, ExclusionReason{
				Variant:      variantName,
				JobValue:     "",
				FilterValues: allowedValues,
			})
			continue
		}
		found := false
		for _, allowed := range allowedValues {
			if jobValue == allowed {
				found = true
				break
			}
		}
		if !found {
			exclusions = append(exclusions, ExclusionReason{
				Variant:      variantName,
				JobValue:     jobValue,
				FilterValues: allowedValues,
			})
		}
	}

	sort.Slice(exclusions, func(i, j int) bool {
		return exclusions[i].Variant < exclusions[j].Variant
	})

	return &JobDiagnosis{
		JobName:          jobName,
		Included:         len(exclusions) == 0,
		Variants:         variants,
		ExclusionReasons: exclusions,
	}, nil
}

// variantKey builds a stable string key from a job's variants, excluding release-specific ones.
func variantKey(variants map[string]string, keys []string) string {
	var parts []string
	for _, k := range keys {
		if releaseVariants[k] {
			continue
		}
		parts = append(parts, k+"="+variants[k])
	}
	sort.Strings(parts)
	return strings.Join(parts, "|")
}


// buildNormalizedJobs matches sample and basis jobs by their variant values.
func buildNormalizedJobs(
	sampleJobs, basisJobs map[string]dataprovider.JobRunStats,
	jobVariantMap map[string]map[string]string,
	variantKeys []string,
) []NormalizedJob {
	sort.Strings(variantKeys)

	type jobEntry struct {
		stats    dataprovider.JobRunStats
		variants map[string]string
		normName string
	}

	sampleByKey := map[string]jobEntry{}
	for name, stats := range sampleJobs {
		variants := jobVariantMap[name]
		if variants == nil {
			variants = map[string]string{}
		}
		key := variantKey(variants, variantKeys)
		sampleByKey[key] = jobEntry{stats: stats, variants: variants, normName: utils.NormalizeProwJobName(name)}
	}

	basisByKey := map[string]jobEntry{}
	for name, stats := range basisJobs {
		variants := jobVariantMap[name]
		if variants == nil {
			variants = map[string]string{}
		}
		key := variantKey(variants, variantKeys)
		basisByKey[key] = jobEntry{stats: stats, variants: variants, normName: utils.NormalizeProwJobName(name)}
	}

	allKeys := map[string]bool{}
	for k := range sampleByKey {
		allKeys[k] = true
	}
	for k := range basisByKey {
		allKeys[k] = true
	}

	var jobs []NormalizedJob
	for key := range allKeys {
		sample, hasSample := sampleByKey[key]
		basis, hasBasis := basisByKey[key]

		var normName string
		var variants map[string]string
		if hasSample {
			normName = sample.normName
			variants = sample.variants
		} else {
			normName = basis.normName
			variants = basis.variants
		}

		cleanVariants := map[string]string{}
		for k, v := range variants {
			if !releaseVariants[k] {
				cleanVariants[k] = v
			}
		}

		nj := NormalizedJob{
			NormalizedName: normName,
			Variants:       cleanVariants,
		}
		if hasSample {
			s := sample.stats
			nj.Sample = &s
		}
		if hasBasis {
			b := basis.stats
			nj.Basis = &b
		}
		jobs = append(jobs, nj)
	}

	sort.Slice(jobs, func(i, j int) bool {
		return jobs[i].NormalizedName < jobs[j].NormalizedName
	})

	return jobs
}

// collectJobNames returns a deduplicated list of all job names from both maps.
func collectJobNames(maps ...map[string]dataprovider.JobRunStats) []string {
	seen := map[string]bool{}
	for _, m := range maps {
		for name := range m {
			seen[name] = true
		}
	}
	names := make([]string, 0, len(seen))
	for name := range seen {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}


