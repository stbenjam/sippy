package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	sippyv1 "github.com/openshift/sippy/pkg/apis/sippy/v1"
	v1 "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/html/generichtml"
	"github.com/openshift/sippy/pkg/util"
)

func listJobsByVariant(current, previous []v1.JobResult) []sippyv1.Job {
	jobs := make([]sippyv1.Job, 0)

	for idx, jobResult := range current {
		prevResult := util.FindJobResultForJobName(jobResult.Name, previous)

		job := sippyv1.Job{
			ID:                             idx,
			Name:                           jobResult.Name,
			CurrentPassPercentage:          jobResult.PassPercentage,
			CurrentProjectedPassPercentage: jobResult.PassPercentageWithoutInfrastructureFailures,
			CurrentRuns:                    jobResult.Failures + jobResult.Successes,
		}

		if prevResult != nil {
			job.PreviousPassPercentage = prevResult.PassPercentage
			job.PreviousProjectedPassPercentage = prevResult.PassPercentageWithoutInfrastructureFailures
			job.PreviousRuns = prevResult.Failures + prevResult.Successes
			job.NetImprovement = jobResult.PassPercentage - prevResult.PassPercentage
		}

		jobs = append(jobs, job)
	}

	return jobs
}

func PrintVariantsReport(w http.ResponseWriter, current, previous []v1.JobResult) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	response := listJobsByVariant(current, previous)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		generichtml.PrintStatusMessage(w, http.StatusInternalServerError, fmt.Sprintf("could not print test results: %s", err))
	}
}
