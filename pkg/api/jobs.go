package api

import (
	"net/http"
	"regexp"
	gosort "sort"
	"strconv"
	"strings"

	v1 "github.com/openshift/sippy/pkg/apis/sippy/v1"
	v1sippyprocessing "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/util"
)

func jobFilter(req *http.Request) func(result v1sippyprocessing.JobResult) bool {
	filterBy := req.URL.Query().Get("filterBy")
	runs, _ := strconv.Atoi(req.URL.Query().Get("runs"))
	job := req.URL.Query().Get("job")

	switch filterBy {
	case "name":
		return func(jobResult v1sippyprocessing.JobResult) bool {
			return strings.Contains(jobResult.Name, job)
		}
	case "upgrade":
		return func(jobResult v1sippyprocessing.JobResult) bool {
			return strings.Contains(jobResult.Name, "-upgrade-")
		}
	case "runs":
		return func(jobResult v1sippyprocessing.JobResult) bool {
			return (jobResult.Failures + jobResult.Successes) >= runs
		}
	case "hasBug":
		return func(jobResult v1sippyprocessing.JobResult) bool {
			return len(jobResult.BugList) > 0
		}
	case "noBug":
		return func(jobResult v1sippyprocessing.JobResult) bool {
			return len(jobResult.BugList) == 0
		}
	default:
		// Unfiltered
		return nil
	}
}

type jobsAPIResult []v1.Job

func (jobs jobsAPIResult) sort(req *http.Request) jobsAPIResult {
	sortBy := req.URL.Query().Get("sortBy")

	switch sortBy {
	case "regression":
		gosort.Slice(jobs, func(i, j int) bool {
			return jobs[i].NetImprovement < jobs[j].NetImprovement
		})
	case "improvement":
		gosort.Slice(jobs, func(i, j int) bool {
			return jobs[i].NetImprovement < jobs[j].NetImprovement
		})
	}

	return jobs
}

func (jobs jobsAPIResult) limit(req *http.Request) jobsAPIResult {
	limit, _ := strconv.Atoi(req.URL.Query().Get("limit"))
	if limit > 0 {
		return jobs[:limit]
	}

	return jobs
}

func PrintJobsReport(w http.ResponseWriter, req *http.Request, current, previous []v1sippyprocessing.JobResult) {
	jobs := jobsAPIResult{}
	filter := jobFilter(req)
	briefName := regexp.MustCompile("periodic-ci-openshift-release-master-(ci|nightly)-[0-9]+.[0-9]+-")

	for idx, jobResult := range current {
		if filter != nil && !filter(jobResult) {
			continue
		}

		prevResult := util.FindJobResultForJobName(jobResult.Name, previous)
		job := v1.Job{
			ID:                             idx,
			Name:                           jobResult.Name,
			BriefName:                      briefName.ReplaceAllString(jobResult.Name, ""),
			CurrentPassPercentage:          jobResult.PassPercentage,
			CurrentProjectedPassPercentage: jobResult.PassPercentageWithoutInfrastructureFailures,
			CurrentRuns:                    jobResult.Failures + jobResult.Successes,
		}

		if previous != nil {
			job.PreviousPassPercentage = prevResult.PassPercentage
			job.PreviousProjectedPassPercentage = prevResult.PassPercentageWithoutInfrastructureFailures
			job.PreviousRuns = prevResult.Failures + prevResult.Successes
			job.NetImprovement = jobResult.PassPercentage - prevResult.PassPercentage
		}

		job.Bugs = jobResult.BugList
		job.AssociatedBugs = jobResult.AssociatedBugList
		job.TestGridURL = jobResult.TestGridURL

		jobs = append(jobs, job)
	}

	respondWithJSON(w, jobs.
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

func PrintJobDetailsReport(w http.ResponseWriter, req *http.Request, current, previous []v1sippyprocessing.JobResult) {
	var min, max int
	jobs := make([]jobDetail, 0)
	filter := jobFilter(req)

	for _, jobResult := range current {
		if filter != nil && !filter(jobResult) {
			continue
		}

		prevResult := util.FindJobResultForJobName(jobResult.Name, previous)

		buildResults := append(jobResult.BuildResults, prevResult.BuildResults...)
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

	respondWithJSON(w, jobDetailAPIResult{
		Jobs:  jobs,
		Start: min,
		End:   max,
	})
}
