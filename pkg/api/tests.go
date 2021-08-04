package api

import (
	v1 "github.com/openshift/sippy/pkg/apis/sippy/v1"
	v1sippyprocessing "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/html/installhtml"
	"github.com/openshift/sippy/pkg/testgridanalysis/testidentification"
	"github.com/openshift/sippy/pkg/util"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

func PrintTestsDetailsJSON(w http.ResponseWriter, req *http.Request, current, previous v1sippyprocessing.TestReport) {
	respondWithJSON(w, installhtml.TestDetailTests(installhtml.JSON, current, previous, req.URL.Query()["test"]))
}

func testFilter(req *http.Request, release string) func(result v1sippyprocessing.FailingTestResult) bool {
	filterBy := req.URL.Query().Get("filterBy")
	runs, _ := strconv.Atoi(req.URL.Query().Get("runs"))
	names := req.URL.Query()["test"]

	var filter func(result v1sippyprocessing.FailingTestResult) bool
	switch filterBy {
	case "name":
		filter = func(test v1sippyprocessing.FailingTestResult) bool {
			regex := regexp.QuoteMeta(strings.Join(names, "|"))
			match, err := regexp.Match(regex, []byte(test.TestName))
			if err != nil {
				return false
			}
			return match
		}
	case "install":
		filter = func(test v1sippyprocessing.FailingTestResult) bool {
			return testidentification.IsInstallRelatedTest(test.TestName)
		}
	case "upgrade":
		filter = func(test v1sippyprocessing.FailingTestResult) bool {
			return testidentification.IsUpgradeRelatedTest(test.TestName)
		}
	case "runs":
		filter = func(test v1sippyprocessing.FailingTestResult) bool {
			return (test.TestResultAcrossAllJobs.Failures + test.TestResultAcrossAllJobs.Successes + test.TestResultAcrossAllJobs.Flakes) > runs
		}
	case "trt":
		filter = func(test v1sippyprocessing.FailingTestResult) bool {
			return testidentification.IsCuratedTest(release, test.TestName)
		}
	case "hasBug":
		return func(test v1sippyprocessing.FailingTestResult) bool {
			return len(test.TestResultAcrossAllJobs.BugList) > 0
		}
	case "noBug":
		return func(test v1sippyprocessing.FailingTestResult) bool {
			return len(test.TestResultAcrossAllJobs.BugList) == 0
		}
	}

	return filter
}

type testsApiResult []v1.Test

func (tests testsApiResult) sort(req *http.Request) testsApiResult {
	sortBy := req.URL.Query().Get("sortBy")

	switch sortBy {
	case "regression":
		sort.Slice(tests, func(i, j int) bool {
			return tests[i].NetImprovement < tests[j].NetImprovement
		})
	case "improvement":
		sort.Slice(tests, func(i, j int) bool {
			return tests[i].NetImprovement > tests[j].NetImprovement
		})
	}

	return tests
}

func (tests testsApiResult) limit(req *http.Request) testsApiResult {
	limit, _ := strconv.Atoi(req.URL.Query().Get("limit"))
	if limit > 0 {
		return tests[:limit]
	}

	return tests
}

func PrintTestsJSON(release string, w http.ResponseWriter, req *http.Request, current []v1sippyprocessing.FailingTestResult, previous []v1sippyprocessing.FailingTestResult) {
	tests := testsApiResult{}
	filter := testFilter(req, release)

	for idx, test := range current {
		if filter != nil && !filter(test) {
			continue
		}

		testPrev := util.FindFailedTestResult(test.TestName, previous)

		var row v1.Test
		row = v1.Test{
			ID:                    idx,
			Name:                  test.TestName,
			CurrentSuccesses:      test.TestResultAcrossAllJobs.Successes,
			CurrentFailures:       test.TestResultAcrossAllJobs.Failures,
			CurrentFlakes:         test.TestResultAcrossAllJobs.Flakes,
			CurrentPassPercentage: test.TestResultAcrossAllJobs.PassPercentage,
			CurrentRuns:           test.TestResultAcrossAllJobs.Successes + test.TestResultAcrossAllJobs.Failures + test.TestResultAcrossAllJobs.Flakes,
		}
		if testPrev != nil {
			row.PreviousSuccesses = testPrev.TestResultAcrossAllJobs.Successes
			row.PreviousFlakes = testPrev.TestResultAcrossAllJobs.Flakes
			row.PreviousFailures = testPrev.TestResultAcrossAllJobs.Failures
			row.PreviousPassPercentage = testPrev.TestResultAcrossAllJobs.PassPercentage
			row.PreviousRuns = testPrev.TestResultAcrossAllJobs.Successes + testPrev.TestResultAcrossAllJobs.Failures + testPrev.TestResultAcrossAllJobs.Flakes
			row.NetImprovement = row.CurrentPassPercentage - row.PreviousPassPercentage
		}

		row.Bugs = test.TestResultAcrossAllJobs.BugList
		row.AssociatedBugs = test.TestResultAcrossAllJobs.AssociatedBugList

		tests = append(tests, row)
	}

	respondWithJSON(w, tests.
		sort(req).
		limit(req))
}
