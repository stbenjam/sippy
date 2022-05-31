package testgridconversion

import (
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	testgridv1 "github.com/openshift/sippy/pkg/apis/testgrid/v1"
	"github.com/openshift/sippy/pkg/testgridanalysis/testgridanalysisapi"
	"github.com/openshift/sippy/pkg/testidentification"
	log "github.com/sirupsen/logrus"
)

const overall string = "Overall"

type SyntheticTestManager interface {
	// CreateSyntheticTests takes the JobRunResult information and produces some pre-analysis by interpreting different types of failures
	// and potentially producing synthetic test results and aggregations to better inform sippy.
	// This needs to be called after all the JobDetails have been processed.
	// This method mutates the rawJobResults
	// returns warnings found in the data. Not failures to process it.
	CreateSyntheticTests(rawJobResults testgridanalysisapi.RawData) []string
	CreateSyntheticTestsForJob(jobResults testgridanalysisapi.RawJobResult) []string
}

type ProcessingOptions struct {
	SyntheticTestManager SyntheticTestManager
	StartDay             int
	NumDays              int
}

// ProcessTestGridDataIntoRawJobResults returns the raw data and a list of warnings encountered processing the data
// for all jobs.
// TODO: deprecated, use the single job func below to avoid loading all into memory
func (o ProcessingOptions) ProcessTestGridDataIntoRawJobResults(testGridJobInfo []testgridv1.JobDetails) (testgridanalysisapi.RawData, []string) {
	rawJobResults := testgridanalysisapi.RawData{JobResults: map[string]testgridanalysisapi.RawJobResult{}}

	for _, jobDetails := range testGridJobInfo {
		log.Infof("processing test details for job %s\n", jobDetails.Name)
		startCol, endCol := computeLookback(o.StartDay, o.NumDays, jobDetails.Timestamps)
		jobResult := processJobDetails(jobDetails, startCol, endCol)
		// we have mutated, so assign back to our intermediate value
		rawJobResults.JobResults[jobDetails.Name] = *jobResult
	}

	// now that we have all the JobRunResults, use them to create synthetic tests for install, upgrade, and infra
	warnings := o.SyntheticTestManager.CreateSyntheticTests(rawJobResults)

	return rawJobResults, warnings
}

// ProcessJobDetailsIntoRawJobResult returns the raw data and a list of warnings encountered processing the data
// for a specific job.
func (o ProcessingOptions) ProcessJobDetailsIntoRawJobResult(jobDetails testgridv1.JobDetails) (*testgridanalysisapi.RawJobResult, []string) {
	log.Infof("processing test details for job %s\n", jobDetails.Name)
	startCol, endCol := computeLookback(o.StartDay, o.NumDays, jobDetails.Timestamps)
	jobResult := processJobDetails(jobDetails, startCol, endCol)
	// now that we have all the JobRunResults, use them to create synthetic tests for install, upgrade, and infra
	warnings := o.SyntheticTestManager.CreateSyntheticTestsForJob(*jobResult)
	return jobResult, warnings
}

func processJobDetails(job testgridv1.JobDetails, startCol, endCol int) *testgridanalysisapi.RawJobResult {
	jobResult := &testgridanalysisapi.RawJobResult{
		JobName:        job.Name,
		TestGridJobURL: job.TestGridURL,
		JobRunResults:  map[string]testgridanalysisapi.RawJobRunResult{},
		TestResults:    map[string]testgridanalysisapi.RawTestResult{},
	}
	for i, test := range job.Tests {
		log.Tracef("Analyzing results from %d to %d from job %s for test %s\n", startCol, endCol, job.Name, test.Name)
		job.Tests[i] = test
		processTest(jobResult, job, test, startCol, endCol)
	}
	return jobResult
}

func computeLookback(startDay, numDays int, timestamps []int) (int, int) {
	stopTs := time.Now().Add(time.Duration(-1*(startDay+numDays)*24)*time.Hour).Unix() * 1000
	startTs := time.Now().Add(time.Duration(-1*startDay*24)*time.Hour).Unix() * 1000
	if startDay <= -1 { // find the most recent startTime
		mostRecentTimestamp := 0
		for _, t := range timestamps {
			if t > mostRecentTimestamp {
				mostRecentTimestamp = t
			}
		}
		// more negative numbers mean we have a further offset, so work that out
		startTs = int64(mostRecentTimestamp) + int64((startDay+1)*24*int(time.Hour.Seconds())*1000)
		stopTs = startTs - int64(numDays*24*int(time.Hour.Seconds())*1000)
	}

	log.WithFields(log.Fields{
		"start": startTs,
		"end":   stopTs,
	}).Debugf("calculated lookback")
	start := math.MaxInt32 // start is an int64 so leave overhead for wrapping to negative in case this gets incremented(it does).
	for i, t := range timestamps {
		if int64(t) < startTs && i < start {
			start = i
		}
		if int64(t) < stopTs {
			return start, i
		}
	}
	return start, len(timestamps)
}

// ignoreTestRegex is used to strip out tests that don't have predictive or diagnostic value.  We don't want to show these in our data.
var ignoreTestRegex = regexp.MustCompile(`Run multi-stage test|operator.Import the release payload|operator.Import a release payload|operator.Run template|operator.Build image|Monitor cluster while tests execute|Overall|job.initialize|\[sig-arch\]\[Feature:ClusterUpgrade\] Cluster should remain functional during upgrade`)

// isOverallTest returns true if the given test name qualifies as the "Overall" test. On Oct 4 2021
// the test name changed from "Overall" to "[jobName|testGridTabName].Overall", and for now we need to support both.
func isOverallTest(testName string) bool {
	return testName == overall || strings.HasSuffix(testName, ".Overall")
}

// specific set of test names that include random characters in them
// if they match the known start then look to replace the random chars with 'namespace'
var matchRandomStart = regexp.MustCompile("^\"Installing \"Red Hat Integration")
var matchRandom = regexp.MustCompile("operator in test-[a-z]+")
var matchRandomReplace = "operator in test namespace"

func removeRandomOperatorTestNames(testName string) string {
	// not necessary but narrowing the scope we apply the replace all to
	// by verifying the name starts with our known case
	match := matchRandomStart.MatchString(testName)
	if match {
		return matchRandom.ReplaceAllString(testName, matchRandomReplace)
	}
	// essentially an else
	return testName
}

func fixOldStyleTestNames(testName string) string {
	// we override some test names based on their type.  Historically we misnamed the install and upgrade tests
	// what we really want is to call these the final state
	// This prevents any real results with this junit from counting.  This should only be needed during our transition  and
	// we have to keep it to interpret historical results from 4.6.
	if testidentification.IsOldInstallOperatorTest(testName) || testidentification.IsOldUpgradeOperatorTest(testName) {
		operatorName := testidentification.GetOperatorNameFromTest(testName)
		testName = testgridanalysisapi.OperatorFinalHealthPrefix + " " + operatorName
	}

	return testName
}

// cleanTestName groups together calls for cleansing the test names as needed
func cleanTestName(testName string) string {
	// initialize and then pass through each cleaner function
	cleanedName := testName

	// is this an old test name?
	// we may not need this check any longer based on the comments around the check / fix
	cleanedName = fixOldStyleTestNames(cleanedName)

	// look for the specific case related to red hat integration operator in test random names
	cleanedName = removeRandomOperatorTestNames(cleanedName)

	// if there are more conditions to check for we can add them as we find them
	// ...

	return cleanedName
}

// processTestToJobRunResults adds the tests to the provided JobResult and returns the passed, failed, flaked for the test
//nolint:gocyclo // TODO: Break this function up, see: https://github.com/fzipp/gocyclo
func processTestToJobRunResults(jobResult *testgridanalysisapi.RawJobResult, job testgridv1.JobDetails, test testgridv1.Test, startCol, endCol int) (passed, failed, flaked int) {
	col := 0
	for _, result := range test.Statuses {
		if col > endCol {
			break
		}

		// the test results are run length encoded(e.g. "6 passes, 5 failures, 7 passes"), but since we are searching for a test result
		// from a specific time period, it's possible a particular run of results overlaps the start-point
		// for the time period we care about.  So we need to iterate each encoded run until we get to the column
		// we care about(a column which falls within the timestamp range we care about, then start the analysis with the remaining
		// columns in the run.
		remaining := result.Count
		if col < startCol {
			for i := 0; i < result.Count && col < startCol; i++ {
				col++
				remaining--
			}
		}
		// if after iterating above we still aren't within the column range we care about, don't do any analysis
		// on this run of results.
		if col < startCol {
			continue
		}
		switch result.Value {
		case testgridv1.TestStatusSuccess, testgridv1.TestStatusFlake: // success, flake(failed one or more times but ultimately succeeded)
			for i := col; i < col+remaining && i < endCol; i++ {
				passed++
				if result.Value == testgridv1.TestStatusFlake {
					flaked++
				}
				joburl := fmt.Sprintf("https://prow.ci.openshift.org/view/gcs/%s/%s", job.Query, job.ChangeLists[i])
				jrr, ok := jobResult.JobRunResults[joburl]
				if !ok {
					jrr = testgridanalysisapi.RawJobRunResult{
						Job:       job.Name,
						JobRunURL: joburl,
						Timestamp: job.Timestamps[i],
					}
				}

				jrr.TestResults = append(jrr.TestResults, testgridanalysisapi.RawJobRunTestResult{
					Name:   test.Name,
					Status: result.Value,
				})

				switch {
				case isOverallTest(test.Name):
					jrr.Succeeded = true
					// if the overall job succeeded, install is always considered successful, even for jobs
					// that don't have an explicitly defined install test.
					jrr.InstallStatus = testgridanalysisapi.Success
				case testidentification.IsOperatorHealthTest(test.Name):
					jrr.FinalOperatorStates = append(jrr.FinalOperatorStates, testgridanalysisapi.OperatorState{
						Name:  testidentification.GetOperatorNameFromTest(test.Name),
						State: testgridanalysisapi.Success,
					})
				case testidentification.IsInstallStepEquivalent(test.Name):
					jrr.InstallStatus = testgridanalysisapi.Success
				case testidentification.IsUpgradeStartedTest(test.Name):
					jrr.UpgradeStarted = true
				case testidentification.IsOperatorsUpgradedTest(test.Name):
					jrr.UpgradeForOperatorsStatus = testgridanalysisapi.Success
				case testidentification.IsMachineConfigPoolsUpgradedTest(test.Name):
					jrr.UpgradeForMachineConfigPoolsStatus = testgridanalysisapi.Success
				case testidentification.IsOpenShiftTest(test.Name):
					// If there is a failed test, the aggregated value should stay "Failure"
					if jrr.OpenShiftTestsStatus == "" {
						jrr.OpenShiftTestsStatus = testgridanalysisapi.Success
					}
				}
				jobResult.JobRunResults[joburl] = jrr
			}
		case testgridv1.TestStatusFailure:
			for i := col; i < col+remaining && i < endCol; i++ {
				failed++
				joburl := fmt.Sprintf("https://prow.ci.openshift.org/view/gcs/%s/%s", job.Query, job.ChangeLists[i])
				jrr, ok := jobResult.JobRunResults[joburl]
				if !ok {
					jrr = testgridanalysisapi.RawJobRunResult{
						Job:       job.Name,
						JobRunURL: joburl,
						Timestamp: job.Timestamps[i],
					}
				}
				// only add the failing test and name if it has predictive value.  We excluded all the non-predictive ones above except for these
				// which we use to set various JobRunResult markers
				if !isOverallTest(test.Name) {
					jrr.FailedTestNames = append(jrr.FailedTestNames, test.Name)
					jrr.TestFailures++
				}

				// TODO: should we also add failures to jrr.TestResults so everything is in one place? Kill off FailedTestNames

				switch {
				case isOverallTest(test.Name):
					jrr.Failed = true
				case testidentification.IsOperatorHealthTest(test.Name):
					jrr.FinalOperatorStates = append(jrr.FinalOperatorStates, testgridanalysisapi.OperatorState{
						Name:  testidentification.GetOperatorNameFromTest(test.Name),
						State: testgridanalysisapi.Failure,
					})
				case testidentification.IsInstallStepEquivalent(test.Name):
					jrr.InstallStatus = testgridanalysisapi.Failure
				case testidentification.IsUpgradeStartedTest(test.Name):
					jrr.UpgradeStarted = true // this is still true because we definitely started
				case testidentification.IsOperatorsUpgradedTest(test.Name):
					jrr.UpgradeForOperatorsStatus = testgridanalysisapi.Failure
				case testidentification.IsMachineConfigPoolsUpgradedTest(test.Name):
					jrr.UpgradeForMachineConfigPoolsStatus = testgridanalysisapi.Failure
				case testidentification.IsOpenShiftTest(test.Name):
					jrr.OpenShiftTestsStatus = testgridanalysisapi.Failure
				}
				jobResult.JobRunResults[joburl] = jrr
			}
		}
		col += remaining
	}

	// don't add results for tests that did not run
	if passed+failed+flaked == 0 {
		return
	}

	// pass the name through the cleaner
	addTestResult(jobResult.TestResults, &job, cleanTestName(test.Name), passed, failed, flaked)

	return
}

func processTest(jobResult *testgridanalysisapi.RawJobResult, job testgridv1.JobDetails, test testgridv1.Test, startCol, endCol int) {
	// strip out tests that don't have predictive or diagnostic value
	// we have to know about overall to be able to set the global success or failure.
	// we have to know about install equivalent tests to be able to set infra failures
	// TODO stop doing this so we can avoid any filtering. We can filter when preparing to create the data for display
	if !isOverallTest(test.Name) && !testidentification.IsInstallStepEquivalent(test.Name) && ignoreTestRegex.MatchString(test.Name) {
		return
	}

	processTestToJobRunResults(jobResult, job, test, startCol, endCol)
}

func addTestResult(testResults map[string]testgridanalysisapi.RawTestResult, job *testgridv1.JobDetails, testName string, passed, failed, flaked int) {
	result, ok := testResults[testName]
	if !ok {
		result = testgridanalysisapi.RawTestResult{}
	}
	result.Name = testName
	result.Successes += passed
	result.Failures += failed
	result.Flakes += flaked

	if job != nil {
		result.Timestamps = append(result.Timestamps, job.Timestamps...)
	}

	testResults[testName] = result
}
