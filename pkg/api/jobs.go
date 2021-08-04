package api

import (
	"encoding/json"
	"fmt"
	sippyv1 "github.com/openshift/sippy/pkg/apis/sippy/v1"
	v1 "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/html/generichtml"
	"github.com/openshift/sippy/pkg/util"
	"net/http"
	"sort"
	"strconv"
	"strings"
)

const failure string = "Failure"

func PrintJobs2Report(w http.ResponseWriter, req *http.Request, current, previous []v1.JobResult) {
	jobs := make([]sippyv1.Job, 0)

	filterBy := req.URL.Query().Get("filterBy")
	sortBy := req.URL.Query().Get("sortBy")
	limit, _ := strconv.Atoi(req.URL.Query().Get("limit"))
	runs, _ := strconv.Atoi(req.URL.Query().Get("runs"))
	job := req.URL.Query().Get("job")

	var filterFunc func(result v1.JobResult) bool
	switch filterBy {
	case "name":
		filterFunc = func(jobResult v1.JobResult) bool {
			return strings.Contains(jobResult.Name, job)
		}
	case "upgrade":
		filterFunc = func(jobResult v1.JobResult) bool {
			return strings.Contains(jobResult.Name, "-upgrade-")
		}
	case "runs":
		filterFunc = func(jobResult v1.JobResult) bool {
			return (jobResult.Failures + jobResult.Successes) > runs
		}
	default:
		filterFunc = func(_ v1.JobResult) bool {
			return true
		}
	}

	for idx, jobResult := range current {
		if !filterFunc(jobResult) {
			continue
		}

		prevResult := util.FindJobResultForJobName(jobResult.Name, previous)

		job := sippyv1.Job{
			ID:                             idx,
			Name:                           jobResult.Name,
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

		jobs = append(jobs, job)
	}

	switch sortBy {
	case "regression":
		sort.Slice(jobs, func(i, j int) bool {
			return jobs[i].NetImprovement < jobs[j].NetImprovement
		})
	}

	if limit > 0 {
		jobs = jobs[:limit]
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if err := json.NewEncoder(w).Encode(jobs); err != nil {
		generichtml.PrintStatusMessage(w, http.StatusInternalServerError, fmt.Sprintf("could not print test results: %s", err))
	}
}