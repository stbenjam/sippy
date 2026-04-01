package componentreadiness

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"cloud.google.com/go/bigquery"
	"google.golang.org/api/iterator"

	"github.com/openshift/sippy/pkg/api/componentreadiness/utils"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crtest"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/reqopts"
	bqcachedclient "github.com/openshift/sippy/pkg/bigquery"
	"github.com/openshift/sippy/pkg/bigquery/bqlabel"
	"github.com/openshift/sippy/pkg/util/param"
)

// JobRunStats contains pass/fail statistics for a single concrete job name.
type JobRunStats struct {
	JobName        string  `json:"job_name"`
	TotalRuns      int     `json:"total_runs"`
	SuccessfulRuns int     `json:"successful_runs"`
	PassRate       float64 `json:"pass_rate"`
}

// NormalizedJob groups a sample and basis job by their normalized (release-agnostic) name.
type NormalizedJob struct {
	NormalizedName string            `json:"normalized_name"`
	Variants       map[string]string `json:"variants"`
	Sample         *JobRunStats      `json:"sample,omitempty"`
	Basis          *JobRunStats      `json:"basis,omitempty"`
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

// jobRunRow is the BigQuery result row for the view jobs query.
type jobRunRow struct {
	JobName    string `bigquery:"job_name"`
	TotalRuns  int    `bigquery:"total_runs"`
	Successful int    `bigquery:"successful_runs"`
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

// GetViewJobsFromBigQuery returns CI jobs contributing to a component readiness report.
func GetViewJobsFromBigQuery(
	ctx context.Context,
	client *bqcachedclient.Client,
	reqOptions reqopts.RequestOptions,
	allJobVariants crtest.JobVariants,
) (*ViewJobsResponse, error) {
	sampleJobs, err := queryJobRuns(ctx, client, reqOptions, allJobVariants,
		reqOptions.SampleRelease.Name, reqOptions.SampleRelease.Start, reqOptions.SampleRelease.End)
	if err != nil {
		return nil, fmt.Errorf("error querying sample jobs: %w", err)
	}

	basisJobs, err := queryJobRuns(ctx, client, reqOptions, allJobVariants,
		reqOptions.BaseRelease.Name, reqOptions.BaseRelease.Start, reqOptions.BaseRelease.End)
	if err != nil {
		return nil, fmt.Errorf("error querying basis jobs: %w", err)
	}

	allJobNames := collectJobNames(sampleJobs, basisJobs)
	jobVariantMap, err := queryJobVariantValues(ctx, client, allJobNames, reqOptions.VariantOption.DBGroupBy.List())
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
	client *bqcachedclient.Client,
	reqOptions reqopts.RequestOptions,
	jobName string,
) (*JobDiagnosis, error) {
	variants, err := lookupJobVariants(ctx, client, jobName)
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

// queryJobRuns queries BigQuery for job run statistics filtered by variant options.
func queryJobRuns(
	ctx context.Context,
	client *bqcachedclient.Client,
	reqOptions reqopts.RequestOptions,
	allJobVariants crtest.JobVariants,
	release string,
	start, end any,
) (map[string]JobRunStats, error) {
	joinVariants := ""
	for _, v := range sortedViewJobVariantKeys(allJobVariants.Variants) {
		cleanV := param.Cleanse(v)
		joinVariants += fmt.Sprintf(
			"LEFT JOIN %s.job_variants jv_%s ON jobs.prowjob_job_name = jv_%s.job_name AND jv_%s.variant_name = '%s'\n",
			client.Dataset, cleanV, cleanV, cleanV, v)
	}

	variantFilters := ""
	var params []bigquery.QueryParameter

	includeVariants := reqOptions.VariantOption.IncludeVariants
	if includeVariants == nil {
		includeVariants = map[string][]string{}
	}
	for _, group := range sortedViewJobVariantKeys(includeVariants) {
		cleanGroup := param.Cleanse(group)
		paramName := fmt.Sprintf("variantGroup_%s", cleanGroup)
		variantFilters += fmt.Sprintf(" AND (jv_%s.variant_value IN UNNEST(@%s))", cleanGroup, paramName)
		params = append(params, bigquery.QueryParameter{
			Name:  paramName,
			Value: includeVariants[group],
		})
	}

	queryString := fmt.Sprintf(`
		SELECT
			jobs.prowjob_job_name AS job_name,
			COUNT(DISTINCT jobs.prowjob_build_id) AS total_runs,
			COUNTIF(jobs.prowjob_state = 'success') AS successful_runs
		FROM %s.jobs jobs
		%s
		WHERE jobs.prowjob_start >= DATETIME(@From)
			AND jobs.prowjob_start < DATETIME(@To)
			AND jv_Release.variant_value = @Release
			AND (jobs.prowjob_job_name LIKE 'periodic-%%' OR jobs.prowjob_job_name LIKE 'release-%%' OR jobs.prowjob_job_name LIKE 'aggregator-%%')
			%s
		GROUP BY jobs.prowjob_job_name
		ORDER BY jobs.prowjob_job_name
	`, client.Dataset, joinVariants, variantFilters)

	params = append(params,
		bigquery.QueryParameter{Name: "From", Value: start},
		bigquery.QueryParameter{Name: "To", Value: end},
		bigquery.QueryParameter{Name: "Release", Value: release},
	)

	q := client.Query(ctx, bqlabel.CRViewJobs, queryString)
	q.Parameters = params

	it, err := q.Read(ctx)
	if err != nil {
		return nil, fmt.Errorf("error executing view jobs query: %w", err)
	}

	results := map[string]JobRunStats{}
	for {
		var row jobRunRow
		err := it.Next(&row)
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading view jobs row: %w", err)
		}
		passRate := 0.0
		if row.TotalRuns > 0 {
			passRate = float64(row.Successful) / float64(row.TotalRuns) * 100
		}
		results[row.JobName] = JobRunStats{
			JobName:        row.JobName,
			TotalRuns:      row.TotalRuns,
			SuccessfulRuns: row.Successful,
			PassRate:       passRate,
		}
	}
	return results, nil
}

// queryJobVariantValues fetches variant key/value pairs for the given job names.
func queryJobVariantValues(
	ctx context.Context,
	client *bqcachedclient.Client,
	jobNames []string,
	variantKeys []string,
) (map[string]map[string]string, error) {
	if len(jobNames) == 0 {
		return map[string]map[string]string{}, nil
	}

	queryString := fmt.Sprintf(`
		SELECT job_name, variant_name, variant_value
		FROM %s.job_variants
		WHERE job_name IN UNNEST(@JobNames)
			AND variant_name IN UNNEST(@VariantNames)
	`, client.Dataset)

	q := client.Query(ctx, bqlabel.CRViewJobs, queryString)
	q.Parameters = []bigquery.QueryParameter{
		{Name: "JobNames", Value: jobNames},
		{Name: "VariantNames", Value: variantKeys},
	}

	it, err := q.Read(ctx)
	if err != nil {
		return nil, fmt.Errorf("error querying job variant values: %w", err)
	}

	type variantRow struct {
		JobName      string `bigquery:"job_name"`
		VariantName  string `bigquery:"variant_name"`
		VariantValue string `bigquery:"variant_value"`
	}

	results := map[string]map[string]string{}
	for {
		var row variantRow
		err := it.Next(&row)
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading job variant row: %w", err)
		}
		if results[row.JobName] == nil {
			results[row.JobName] = map[string]string{}
		}
		results[row.JobName][row.VariantName] = row.VariantValue
	}
	return results, nil
}

// lookupJobVariants fetches all variant key/value pairs for a single job from BigQuery.
func lookupJobVariants(ctx context.Context, client *bqcachedclient.Client, jobName string) (map[string]string, error) {
	queryString := fmt.Sprintf(`
		SELECT variant_name, variant_value
		FROM %s.job_variants
		WHERE job_name = @JobName
	`, client.Dataset)

	q := client.Query(ctx, bqlabel.CRViewJobs, queryString)
	q.Parameters = []bigquery.QueryParameter{
		{Name: "JobName", Value: jobName},
	}

	it, err := q.Read(ctx)
	if err != nil {
		return nil, fmt.Errorf("error querying job variants: %w", err)
	}

	type row struct {
		VariantName  string `bigquery:"variant_name"`
		VariantValue string `bigquery:"variant_value"`
	}

	variants := map[string]string{}
	for {
		var r row
		err := it.Next(&r)
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading variant row: %w", err)
		}
		variants[r.VariantName] = r.VariantValue
	}
	return variants, nil
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
	sampleJobs, basisJobs map[string]JobRunStats,
	jobVariantMap map[string]map[string]string,
	variantKeys []string,
) []NormalizedJob {
	sort.Strings(variantKeys)

	type jobEntry struct {
		stats    JobRunStats
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
func collectJobNames(maps ...map[string]JobRunStats) []string {
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

// sortedViewJobVariantKeys returns sorted keys from a map with string slice values.
func sortedViewJobVariantKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
