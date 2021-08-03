package api

import (
	"encoding/json"
	"fmt"
	sippyv1 "github.com/openshift/sippy/pkg/apis/sippy/v1"
	v1 "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/html/generichtml"
	"github.com/openshift/sippy/pkg/util"
	"net/http"
	"strings"
	"time"

	testgridv1 "github.com/openshift/sippy/pkg/apis/testgrid/v1"
	"github.com/openshift/sippy/pkg/testgridanalysis/testgridanalysisapi"
	"github.com/openshift/sippy/pkg/testgridanalysis/testgridconversion"
	"k8s.io/klog"
)

const failure string = "Failure"

func jobRunStatus(result testgridanalysisapi.RawJobRunResult) string {
	if result.Succeeded {
		return "S" // Success
	}

	if !result.Failed {
		return "R" // Running
	}

	if result.SetupStatus == failure {
		if len(result.FinalOperatorStates) == 0 {
			return "N" // iNfrastructure failure
		}
		return "I" // Install failure
	}
	if result.UpgradeStarted && (result.UpgradeForOperatorsStatus == failure || result.UpgradeForMachineConfigPoolsStatus == failure) {
		return "U" // Upgrade failure
	}
	if result.OpenShiftTestsStatus == failure {
		return "F" // Failure
	}
	if result.SetupStatus == "" {
		return "n" // no setup results
	}
	return "f" // unknown failure
}

func PrintJobs2Report(w http.ResponseWriter, req *http.Request, current, previous []v1.JobResult) {
	jobs := make([]sippyv1.Job, 0)

	filterBy := req.URL.Query().Get("filterBy")
	job := req.URL.Query().Get("job")

	var filterFunc func(string) bool
	switch filterBy {
	case "name":
		filterFunc = func(name string) bool {
			return strings.Contains(name, job)
		}
	case "upgrade":
		filterFunc = func(name string) bool {
			return strings.Contains(name, "-upgrade-")
		}
	default:
		filterFunc = func(_ string) bool {
			return true
		}
	}

	for idx, jobResult := range current {
		if !filterFunc(jobResult.Name) {
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

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if err := json.NewEncoder(w).Encode(jobs); err != nil {
		generichtml.PrintStatusMessage(w, http.StatusInternalServerError, fmt.Sprintf("could not print test results: %s", err))
	}
}

func PrintJobsReport(w http.ResponseWriter, syntheticTestManager testgridconversion.SyntheticTestManager, testGridJobDetails []testgridv1.JobDetails, lastUpdateTime time.Time) {
	rawJobResultOptions := testgridconversion.ProcessingOptions{
		SyntheticTestManager: syntheticTestManager,
		StartDay:             0,
		NumDays:              1000,
	}
	rawJobResults, _ := rawJobResultOptions.ProcessTestGridDataIntoRawJobResults(testGridJobDetails)

	type jsonJob struct {
		Name        string   `json:"name"`
		Timestamps  []int    `json:"timestamps"`
		Results     []string `json:"results"`
		BuildIDs    []string `json:"build_ids"`
		TestGridURL string   `json:"testgrid_url"`
	}
	type jsonResponse struct {
		Jobs           []jsonJob `json:"jobs"`
		LastUpdateTime time.Time `json:"last_update_time"`
	}

	response := jsonResponse{
		LastUpdateTime: lastUpdateTime,
		Jobs:           []jsonJob{},
	}
	for _, job := range testGridJobDetails {
		results := rawJobResults.JobResults[job.Name]
		var statuses []string
		for i := range job.Timestamps {
			joburl := fmt.Sprintf("https://prow.ci.openshift.org/view/gcs/%s/%s", job.Query, job.ChangeLists[i])
			statuses = append(statuses, jobRunStatus(results.JobRunResults[joburl]))
		}
		response.Jobs = append(response.Jobs, jsonJob{
			Name:        job.Name,
			Timestamps:  job.Timestamps,
			Results:     statuses,
			BuildIDs:    job.ChangeLists,
			TestGridURL: job.TestGridURL,
		})
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		e := fmt.Errorf("could not print jobs result: %s", err)
		klog.Errorf(e.Error())
		http.Error(w, e.Error(), http.StatusInternalServerError)
	}
}
