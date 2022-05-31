package testreportconversion

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	bugsv1 "github.com/openshift/sippy/pkg/apis/bugs/v1"
	sippyprocessingv1 "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/buganalysis"
	"github.com/openshift/sippy/pkg/testgridanalysis/testgridanalysisapi"
	"github.com/openshift/sippy/pkg/testidentification"
)

func useNewInstallTest(release string) bool {
	digits := strings.Split(release, ".")
	if len(digits) < 2 {
		return false
	}
	major, err := strconv.Atoi(digits[0])
	if err != nil {
		return false
	}
	minor, err := strconv.Atoi(digits[1])
	if err != nil {
		return false
	}
	if major < 4 {
		return false
	} else if major == 4 && minor < 11 {
		return false
	}
	return true
}

func PrepareTestReport(
	reportName string,
	reportType sippyprocessingv1.ReportType,
	rawData testgridanalysisapi.RawData,
	variantManager testidentification.VariantManager,
	bugCache buganalysis.BugCache, // required to associate tests with bug
	bugzillaRelease string, // required to limit bugs to those that apply to the release in question
	// TODO refactor into a test run filter
	minRuns int, // indicates how many runs are required for a test is included in overall percentages
	// TODO deads2k wants to eliminate the successThreshold
	successThreshold float64, // indicates an upper bound on how successful a test can be before it is excluded
	numDays int, // indicates how many days of data to collect
	analysisWarnings []string,
	reportTimestamp time.Time, // TODO seems like we could derive this from our raw data
	failureClusterThreshold int, // TODO I don't think we even display this anymore

) sippyprocessingv1.TestReport {

	// allJobResults holds all the job results with all the test results.  It contains complete frequency information and
	allJobResults := ConvertRawJobResultsToProcessedJobResults(
		reportName, rawData, bugCache, bugzillaRelease, variantManager)

	removeUninterestingTests(allJobResults)

	stats := calculateJobResultStatistics(allJobResults)

	allTestResultsByName := getTestResultsByName(allJobResults)

	standardTestResultFilterFn := StandardTestResultFilter(minRuns, successThreshold)
	infrequentJobsTestResultFilterFn := StandardTestResultFilter(2, successThreshold)

	byVariant := convertRawDataToByVariant(allJobResults, standardTestResultFilterFn, variantManager)
	variantHealth := convertVariantResultsToHealth(byVariant)

	filteredFailureGroups := filterFailureGroups(rawData.JobResults, failureClusterThreshold)
	frequentJobResults := filterPertinentFrequentJobResults(allJobResults, numDays, standardTestResultFilterFn)
	infrequentJobResults := filterPertinentInfrequentJobResults(allJobResults, numDays, infrequentJobsTestResultFilterFn)

	bugFailureCounts := generateSortedBugFailureCounts(allTestResultsByName)
	bugzillaComponentResults := generateAllJobFailuresByBugzillaComponent(rawData.JobResults, allJobResults)

	topFailingTestsWithBug := getTopFailingTestsWithBug(allTestResultsByName, standardTestResultFilterFn)
	topFailingTestsWithoutBug := getTopFailingTestsWithoutBug(allTestResultsByName, standardTestResultFilterFn)
	curatedTests := getCuratedTests(bugzillaRelease, allTestResultsByName)

	// the top level indicators should exclude jobs that are not yet stable, because those failures are not informative
	var infra, config, bootstrap, other, install sippyprocessingv1.FailingTestResult
	// the new install tests are only available for releases after 4.11
	if useNewInstallTest(reportName) {
		infra = excludeNeverStableAndTechPreviewJobs(allTestResultsByName[testgridanalysisapi.NewInfrastructureTestName], variantManager)
		config = excludeNeverStableAndTechPreviewJobs(allTestResultsByName[testgridanalysisapi.InstallConfigTestName], variantManager)
		bootstrap = excludeNeverStableAndTechPreviewJobs(allTestResultsByName[testgridanalysisapi.InstallBootstrapTestName], variantManager)
		other = excludeNeverStableAndTechPreviewJobs(allTestResultsByName[testgridanalysisapi.InstallOtherTestName], variantManager)
		install = excludeNeverStableAndTechPreviewJobs(allTestResultsByName[testgridanalysisapi.NewInstallTestName], variantManager)
	} else {
		infra = excludeNeverStableAndTechPreviewJobs(allTestResultsByName[testgridanalysisapi.SippySuiteName+"."+testgridanalysisapi.InfrastructureTestName], variantManager)
		install = excludeNeverStableAndTechPreviewJobs(allTestResultsByName[testgridanalysisapi.SippySuiteName+"."+testgridanalysisapi.InstallTestName], variantManager)
	}
	upgrade := excludeNeverStableAndTechPreviewJobs(allTestResultsByName[testgridanalysisapi.SippySuiteName+"."+testgridanalysisapi.UpgradeTestName], variantManager)
	tests := excludeNeverStableAndTechPreviewJobs(allTestResultsByName[testgridanalysisapi.SippySuiteName+"."+testgridanalysisapi.OpenShiftTestsName], variantManager)

	finalOperatorHealth := excludeNeverStableAndTechPreviewJobs(allTestResultsByName[testgridanalysisapi.SippySuiteName+"."+testgridanalysisapi.FinalOperatorHealthTestName], variantManager)

	// Only generate promotion warnings based on current reporting
	if reportType == sippyprocessingv1.CurrentReport {
		promotionWarnings := generatePromotionWarnings(byVariant)
		analysisWarnings = append(analysisWarnings, promotionWarnings...)
	}

	testReport := sippyprocessingv1.TestReport{
		ReportType:    reportType,
		Release:       reportName,
		Timestamp:     reportTimestamp,
		JobStatistics: stats,
		TopLevelIndicators: sippyprocessingv1.TopLevelIndicators{
			Infrastructure:      infra,
			InstallConfig:       config,
			Bootstrap:           bootstrap,
			InstallOther:        other,
			Install:             install,
			Upgrade:             upgrade,
			Tests:               tests,
			FinalOperatorHealth: finalOperatorHealth,
			Variant:             variantHealth,
		},

		ByTest:    allTestResultsByName.toOrderedList(),
		ByVariant: byVariant,

		FailureGroups: filteredFailureGroups,

		ByJob:                allJobResults,
		FrequentJobResults:   frequentJobResults,
		InfrequentJobResults: infrequentJobResults,

		BugsByFailureCount:             bugFailureCounts,
		JobFailuresByBugzillaComponent: bugzillaComponentResults,

		TopFailingTestsWithBug:    topFailingTestsWithBug,
		TopFailingTestsWithoutBug: topFailingTestsWithoutBug,
		CuratedTests:              curatedTests,

		AnalysisWarnings: analysisWarnings,
	}

	return testReport
}

func removeUninterestingTests(results []sippyprocessingv1.JobResult) {
	for i := range results {
		result := results[i]
		for j := len(result.TestResults) - 1; j >= 0; j-- {
			testResult := result.TestResults[j]
			if strings.HasSuffix(testResult.Name, ".Overall") { // .Overall is a suffix for a test that doesn't add value
				result.TestResults = append(result.TestResults[:j], result.TestResults[j+1:]...)
			}
		}
	}
}

func generatePromotionWarnings(variants []sippyprocessingv1.VariantResults) []string {
	warnings := make([]string, 0)
	millis12hoursago := time.Now().UTC().Add(-12*time.Hour).Unix() * 1000

	for _, variant := range variants {
		if variant.VariantName == "promote" {
			for _, jr := range variant.JobResults {
				// Check if it's been more than 12 hours since any promotion has run. AllRuns is sorted with most
				// recent first, so all we need to do is look at AllRuns[0]
				if len(jr.AllRuns) > 0 && int64(jr.AllRuns[0].Timestamp) < millis12hoursago {
					warnings = append(warnings,
						fmt.Sprintf(`The <a href="%s">last run of %s</a> was more than 12 hours ago.`, jr.AllRuns[0].URL, jr.Name))
				}

				// Check if the last 3 failed
				if len(jr.AllRuns) < 3 {
					continue
				}

				links := make([]string, 0)
				lastThreeFailed := true
				for _, run := range jr.AllRuns[0:3] {
					if run.OverallResult != sippyprocessingv1.JobSucceeded {
						links = append(links, run.URL)
						continue
					}
					lastThreeFailed = false
				}
				if lastThreeFailed {
					warnings = append(warnings,
						fmt.Sprintf(`The last three (<a href="%s">1</a>, <a href="%s">2</a>, <a href="%s">3</a>) promotion jobs for %s failed!`, links[0], links[1], links[2], jr.Name))
				}
			}
			break
		}
	}

	return warnings
}

func filterFailureGroups(
	rawJobResults map[string]testgridanalysisapi.RawJobResult,
	failureClusterThreshold int,
) []sippyprocessingv1.JobRunResult {
	var filteredJrr []sippyprocessingv1.JobRunResult
	// -1 means don't do this reporting.
	if failureClusterThreshold < 0 {
		return filteredJrr
	}
	for _, jobResult := range rawJobResults {
		for _, rawJRR := range jobResult.JobRunResults {
			if rawJRR.TestFailures < failureClusterThreshold {
				continue
			}

			// TODO: what test result to use here? Based on the caller, it looks like it doesn't matter if we skip the param here:
			filteredJrr = append(filteredJrr, convertRawToJobRunResult(rawJRR, []sippyprocessingv1.TestResult{}))
		}
	}

	// sort from highest to lowest
	sort.SliceStable(filteredJrr, func(i, j int) bool {
		return filteredJrr[i].TestFailures > filteredJrr[j].TestFailures
	})

	return filteredJrr
}

func generateSortedBugFailureCounts(allTestResultsByName testResultsByName) []bugsv1.Bug {
	bugs := map[string]bugsv1.Bug{}

	// for every test that failed in some job run, look up the bug(s) associated w/ the test
	// and attribute the number of times the test failed+flaked to that bug(s)
	for _, testResult := range allTestResultsByName {
		bugList := testResult.TestResultAcrossAllJobs.BugList
		for _, bug := range bugList {
			if b, found := bugs[bug.URL]; found {
				b.FailureCount += testResult.TestResultAcrossAllJobs.Failures
				b.FlakeCount += testResult.TestResultAcrossAllJobs.Flakes
				bugs[bug.URL] = b
			} else {
				bug.FailureCount = testResult.TestResultAcrossAllJobs.Failures
				bug.FlakeCount = testResult.TestResultAcrossAllJobs.Flakes
				bugs[bug.URL] = bug
			}
		}
	}

	sortedBugs := []bugsv1.Bug{}
	for _, bug := range bugs {
		sortedBugs = append(sortedBugs, bug)
	}
	// sort from highest to lowest
	sort.SliceStable(sortedBugs, func(i, j int) bool {
		return sortedBugs[i].FailureCount > sortedBugs[j].FailureCount
	})
	return sortedBugs
}

func percent(success, failure int) float64 {
	if success+failure == 0 {
		return 0.0
	}
	return float64(success) / float64(success+failure) * 100.0
}
