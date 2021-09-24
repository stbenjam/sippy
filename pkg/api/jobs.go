package api

import (
	"encoding/json"
	"net/http"
	"regexp"
	gosort "sort"
	"strconv"
	"strings"

	apitype "github.com/openshift/sippy/pkg/apis/api"

	"github.com/openshift/sippy/pkg/testgridanalysis/testidentification"

	v1sippyprocessing "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/util"
)

type jobsAPIResult []apitype.Job

func (jobs jobsAPIResult) sort(req *http.Request) jobsAPIResult {
	sortField := req.URL.Query().Get("sortField")
	sort := apitype.Sort(req.URL.Query().Get("sort"))

	if sortField == "" {
		sortField = "current_pass_percentage"
	}

	if sort == "" {
		sort = apitype.SortAscending
	}

	gosort.Slice(jobs, func(i, j int) bool {
		if sort == apitype.SortAscending {
			return compare(jobs[i], jobs[j], sortField)
		}
		return compare(jobs[j], jobs[i], sortField)
	})

	return jobs
}

func (jobs jobsAPIResult) limit(req *http.Request) jobsAPIResult {
	limit, _ := strconv.Atoi(req.URL.Query().Get("limit"))
	if limit > 0 && len(jobs) >= limit {
		return jobs[:limit]
	}

	return jobs
}

func briefName(job string) string {
	briefName := regexp.MustCompile("periodic-ci-openshift-(multiarch|release)-master-(ci|nightly)-[0-9]+.[0-9]+-")
	return briefName.ReplaceAllString(job, "")
}

func jobResultToAPI(id int, current, previous *v1sippyprocessing.JobResult) apitype.Job {
	job := apitype.Job{
		ID:        id,
		Name:      current.Name,
		Variants:  current.Variants,
		BriefName: briefName(current.Name),

		GCSBucketName:               current.GCSBucketName,
		GCSJobHistoryLocationPrefix: current.GCSJobHistoryLocationPrefix,
		Topology:                    current.Topology,
		Network:                     current.Network,
		IPMode:                      current.IPMode,

		CurrentPassPercentage:          current.PassPercentage,
		CurrentProjectedPassPercentage: current.PassPercentageWithoutInfrastructureFailures,
		CurrentRuns:                    current.Failures + current.Successes,
	}
	runs := make([]string, 0)
	if current.RunsUpgrade != nil && *current.RunsUpgrade {
		runs = append(runs, "upgrade")
	}

	if current.RunsE2EParallel != nil && *current.RunsE2EParallel {
		runs = append(runs, "parallel")
	}

	if current.RunsE2ESerial != nil && *current.RunsE2ESerial {
		runs = append(runs, "serial")
	}
	job.TestSuites = runs

	if previous != nil {
		job.PreviousPassPercentage = previous.PassPercentage
		job.PreviousProjectedPassPercentage = previous.PassPercentageWithoutInfrastructureFailures
		job.PreviousRuns = previous.Failures + previous.Successes
		job.NetImprovement = current.PassPercentage - previous.PassPercentage
	}

	job.Bugs = current.BugList
	job.AssociatedBugs = current.AssociatedBugList
	job.TestGridURL = current.TestGridURL

	if strings.Contains(job.Name, "-upgrade") {
		job.Tags = []string{"upgrade"}
	}

	return job
}

// PrintJobsReport renders a filtered summary of matching jobs.
func PrintJobsReport(w http.ResponseWriter, req *http.Request, currReport, twoDayReport, prevReport v1sippyprocessing.TestReport, manager testidentification.VariantManager) {
	var filter *Filter
	currentPeriod := currReport.ByJob
	twoDayPeriod := twoDayReport.ByJob
	previousPeriod := prevReport.ByJob

	queryFilter := req.URL.Query().Get("filter")
	if queryFilter != "" {
		filter = &Filter{}
		if err := json.Unmarshal([]byte(queryFilter), filter); err != nil {
			RespondWithJSON(http.StatusBadRequest, w, map[string]interface{}{"code": http.StatusBadRequest, "message": "Could not marshal query:" + err.Error()})
			return
		}
	}

	jobs := jobsAPIResult{}

	// If requesting a two day report, we make the comparison between the last
	// period (typically 7 days) and the last two days.
	var current, previous []v1sippyprocessing.JobResult
	switch req.URL.Query().Get("period") {
	case "twoDay":
		current = twoDayPeriod
		previous = currentPeriod
	default:
		current = currentPeriod
		previous = previousPeriod
	}

	for idx, jobResult := range current {
		prevResult := util.FindJobResultForJobName(jobResult.Name, previous)
		job := jobResultToAPI(idx, &current[idx], prevResult)

		if filter != nil {
			include, err := filter.Filter(job)
			if err != nil {
				RespondWithJSON(http.StatusBadRequest, w, map[string]interface{}{"code": http.StatusBadRequest, "message": "Filter error:" + err.Error()})
				return
			}

			if !include {
				continue
			}
		}

		jobs = append(jobs, job)
	}

	RespondWithJSON(http.StatusOK, w, jobs.
		sort(req).
		limit(req))
}

type jobDetail struct {
	Name    string                           `json:"name"`
	Results []v1sippyprocessing.JobRunResult `json:"results"`
}

type jobDetailAPIResult struct {
	Jobs  []jobDetail `json:"jobs"`
	Start int         `json:"start"`
	End   int         `json:"end"`
}

func (jobs jobDetailAPIResult) limit(req *http.Request) jobDetailAPIResult {
	limit, _ := strconv.Atoi(req.URL.Query().Get("limit"))
	if limit > 0 && len(jobs.Jobs) >= limit {
		jobs.Jobs = jobs.Jobs[:limit]
	}

	return jobs
}

// PrintJobDetailsReport renders the detailed list of runs for matching jobs.
func PrintJobDetailsReport(w http.ResponseWriter, req *http.Request, current, previous []v1sippyprocessing.JobResult) {
	var min, max int
	jobs := make([]jobDetail, 0)
	jobName := req.URL.Query().Get("job")

	for _, jobResult := range current {
		if jobName != "" && !strings.Contains(jobResult.Name, jobName) {
			continue
		}

		prevResult := util.FindJobResultForJobName(jobResult.Name, previous)
		jobRuns := append(jobResult.AllRuns, prevResult.AllRuns...)

		for _, result := range jobRuns {
			if result.Timestamp < min || min == 0 {
				min = result.Timestamp
			}

			if result.Timestamp > max || max == 0 {
				max = result.Timestamp
			}
		}

		jobDetail := jobDetail{
			Name:    jobResult.Name,
			Results: jobRuns,
		}

		jobs = append(jobs, jobDetail)
	}

	RespondWithJSON(http.StatusOK, w, jobDetailAPIResult{
		Jobs:  jobs,
		Start: min,
		End:   max,
	}.limit(req))
}
