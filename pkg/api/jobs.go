package api

import (
	"encoding/json"
	"fmt"
	"github.com/openshift/sippy/pkg/apis/api"
	"net/http"
	"regexp"
	gosort "sort"
	"strconv"
	"strings"
	"time"

	"github.com/openshift/sippy/pkg/testgridanalysis/testidentification"

	v1sippyprocessing "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/util"
)



type jobsAPIResult []api.Job

func (jobs jobsAPIResult) sort(req *http.Request) jobsAPIResult {
	sortBy := req.URL.Query().Get("sortBy")

	switch sortBy {
	case "regression":
		gosort.Slice(jobs, func(i, j int) bool {
			return jobs[i].NetImprovement < jobs[j].NetImprovement
		})
	case "improvement":
		gosort.Slice(jobs, func(i, j int) bool {
			return jobs[i].NetImprovement > jobs[j].NetImprovement
		})
	}

	return jobs
}

func (jobs jobsAPIResult) limit(req *http.Request) jobsAPIResult {
	limit, _ := strconv.Atoi(req.URL.Query().Get("limit"))
	if limit > 0 && len(jobs) >= limit {
		return jobs[:limit]
	}

	return jobs
}

// PrintJobsReport renders a filtered summary of matching jobs.
func PrintJobsReport(w http.ResponseWriter, req *http.Request, currentPeriod, twoDayPeriod, previousPeriod []v1sippyprocessing.JobResult, manager testidentification.VariantManager) {
	var filter *Filter

	queryFilter := req.URL.Query().Get("filter")
	if queryFilter != "" {
		filter = &Filter{}
		if err := json.Unmarshal([]byte(queryFilter), filter); err != nil {
			RespondWithJSON(http.StatusBadRequest, w, map[string]interface{}{"code": http.StatusBadRequest, "message": "Could not marshal query:" + err.Error()})
			return
		}
	}

	jobs := jobsAPIResult{}
	briefName := regexp.MustCompile("periodic-ci-openshift-(multiarch|release)-master-(ci|nightly)-[0-9]+.[0-9]+-")

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
		job := api.Job{
			ID:                             idx,
			Name:                           jobResult.Name,
			Variants:                       manager.IdentifyVariants(jobResult.Name),
			BriefName:                      briefName.ReplaceAllString(jobResult.Name, ""),
			CurrentPassPercentage:          jobResult.PassPercentage,
			CurrentProjectedPassPercentage: jobResult.PassPercentageWithoutInfrastructureFailures,
			CurrentRuns:                    jobResult.Failures + jobResult.Successes,
		}

		prevResult := util.FindJobResultForJobName(jobResult.Name, previous)
		if previous != nil {
			job.PreviousPassPercentage = prevResult.PassPercentage
			job.PreviousProjectedPassPercentage = prevResult.PassPercentageWithoutInfrastructureFailures
			job.PreviousRuns = prevResult.Failures + prevResult.Successes
			job.NetImprovement = jobResult.PassPercentage - prevResult.PassPercentage
		}

		job.Bugs = jobResult.BugList
		job.AssociatedBugs = jobResult.AssociatedBugList
		job.TestGridURL = jobResult.TestGridURL

		if strings.Contains(job.Name, "-upgrade") {
			job.Tags = []string{"upgrade"}
		}

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
	Name    string                          `json:"name"`
	Results []v1sippyprocessing.BuildResult `json:"results"`
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

func getDateRange(req *http.Request) (*int64, *int64, error) {
	startDate := req.URL.Query().Get("startDate")
	endDate := req.URL.Query().Get("endDate")

	if startDate == "" && endDate == "" {
		return nil, nil, nil
	}

	if startDate != "" && endDate == "" {
		return nil, nil, fmt.Errorf("end date is missing")
	}

	if startDate == "" && endDate != "" {
		return nil, nil, fmt.Errorf("start date is missing")
	}

	startParsed, err := time.Parse(`2006-01-02`, startDate)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid start date: %s", err)
	}

	endParsed, err := time.Parse(`2006-01-02`, endDate)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid end date: %s", err)
	}

	startMillis := startParsed.UnixNano() / int64(time.Millisecond)
	endMillis := endParsed.UnixNano() / int64(time.Millisecond)

	return &startMillis, &endMillis, nil
}

// PrintJobDetailsReport renders the detailed list of runs for matching jobs.
func PrintJobDetailsReport(w http.ResponseWriter, req *http.Request, current, previous []v1sippyprocessing.JobResult) {
	var min, max int
	jobs := make([]jobDetail, 0)

	start, end, err := getDateRange(req)
	if err != nil {
		RespondWithJSON(http.StatusBadRequest, w, map[string]interface{}{
			"code": http.StatusBadRequest,
			"message": err.Error(),
		})
		return
	}

	for _, jobResult := range current {
		prevResult := util.FindJobResultForJobName(jobResult.Name, previous)

		// Filter by date
		buildResults := make([]v1sippyprocessing.BuildResult, 0)
		if start != nil && end != nil {
			for _, result := range jobResult.BuildResults {
				if (int64(result.Timestamp) > *start) && int64(result.Timestamp) < *end {
					buildResults = append(buildResults, result)
				}
			}

			for _, result := range prevResult.BuildResults {
				if (int64(result.Timestamp) > *start) && int64(result.Timestamp) < *end {
					buildResults = append(buildResults, result)
				}
			}
		} else {
			buildResults = append(jobResult.BuildResults, prevResult.BuildResults...)
		}

		for _, result := range buildResults {
			if result.Timestamp < min || min == 0 {
				min = result.Timestamp
			}

			if result.Timestamp > max || max == 0 {
				max = result.Timestamp
			}
		}

		jobDetail := jobDetail{
			Name:    jobResult.Name,
			Results: buildResults,
		}

		jobs = append(jobs, jobDetail)
	}

	RespondWithJSON(http.StatusOK, w, jobDetailAPIResult{
		Jobs:  jobs,
		Start: min,
		End:   max,
	}.limit(req))
}
