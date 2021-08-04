package api

import (
	v1 "github.com/openshift/sippy/pkg/apis/sippy/v1"
	v1sippyprocessing "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/util"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
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

type jobsApiResult []v1.Job

func (jobs jobsApiResult) sort(req *http.Request) jobsApiResult {
	sortBy := req.URL.Query().Get("sortBy")

	switch sortBy {
	case "regression":
		sort.Slice(jobs, func(i, j int) bool {
			return jobs[i].NetImprovement < jobs[j].NetImprovement
		})
	case "improvement":
		sort.Slice(jobs, func(i, j int) bool {
			return jobs[i].NetImprovement < jobs[j].NetImprovement
		})
	}

	return jobs
}

func (jobs jobsApiResult) limit(req *http.Request) jobsApiResult {
	limit, _ := strconv.Atoi(req.URL.Query().Get("limit"))
	if limit > 0 {
		return jobs[:limit]
	}

	return jobs
}

func PrintJobsReport(w http.ResponseWriter, req *http.Request, current, previous []v1sippyprocessing.JobResult) {
	jobs := jobsApiResult{}
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
			BriefName:						briefName.ReplaceAllString(jobResult.Name, ""),
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
