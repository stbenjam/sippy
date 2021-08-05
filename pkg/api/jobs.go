package api

import (
	"fmt"
	testgridv1 "github.com/openshift/sippy/pkg/apis/testgrid/v1"
	"github.com/openshift/sippy/pkg/testgridanalysis/testgridanalysisapi"
	"github.com/openshift/sippy/pkg/testgridanalysis/testgridconversion"
	"net/http"
	"regexp"
	gosort "sort"
	"strconv"
	"strings"
	"time"

	v1 "github.com/openshift/sippy/pkg/apis/sippy/v1"
	v1sippyprocessing "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/util"
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
			return "N" // Infrastructure failure
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

func PrintTestGridJobsReport(w http.ResponseWriter, syntheticTestManager testgridconversion.SyntheticTestManager, testGridJobDetails []testgridv1.JobDetails, lastUpdateTime time.Time) {
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
			jobURL := fmt.Sprintf("https://prow.ci.openshift.org/view/gcs/%s/%s", job.Query, job.ChangeLists[i])
			statuses = append(statuses, jobRunStatus(results.JobRunResults[jobURL]))
		}
		response.Jobs = append(response.Jobs, jsonJob{
			Name:        job.Name,
			Timestamps:  job.Timestamps,
			Results:     statuses,
			BuildIDs:    job.ChangeLists,
			TestGridURL: job.TestGridURL,
		})
	}

	respondWithJSON(w, response)
}

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
