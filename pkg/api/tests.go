package api

import (
	"encoding/json"
	"fmt"
	v1sippy "github.com/openshift/sippy/pkg/apis/sippy/v1"
	v1 "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/html/generichtml"
	"github.com/openshift/sippy/pkg/html/installhtml"
	"github.com/openshift/sippy/pkg/testgridanalysis/testidentification"
	"github.com/openshift/sippy/pkg/util"
	"net/http"
	"regexp"
	"strings"
)

func generateTests(filterBy string, names []string, current, previous []v1.FailingTestResult) []v1sippy.Test {
	rows := make([]v1sippy.Test, 0)
	var filter func(result v1.FailingTestResult) bool

	switch filterBy {
		case "name":
			filter = func(test v1.FailingTestResult) bool {
				regex := regexp.QuoteMeta(strings.Join(names, "|"))
				match, err := regexp.Match(regex, []byte(test.TestName))
				if err != nil {
					return false
				}
				return match
			}
		case "install":
			filter = func(test v1.FailingTestResult) bool {
				return testidentification.IsInstallRelatedTest(test.TestName)
			}
		case "upgrade":
			filter = func(test v1.FailingTestResult) bool {
				return testidentification.IsUpgradeRelatedTest(test.TestName)
			}
	}

	for idx, test := range current {
		if filter != nil && !filter(test) {
			continue
		}

		testPrev := util.FindFailedTestResult(test.TestName, previous)
		var row v1sippy.Test
		row = v1sippy.Test{
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

		rows = append(rows, row)
	}

	return rows
}

func PrintTestsDetailsJSON(w http.ResponseWriter, req *http.Request, current, previous v1.TestReport) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	fmt.Fprint(w, installhtml.TestDetailTests("json", current, previous, req.URL.Query()["test"]))
}

func PrintTestsJSON(w http.ResponseWriter, req *http.Request, current []v1.FailingTestResult, previous []v1.FailingTestResult) {
	filterBy := req.URL.Query().Get("filterBy")

	var names []string
	if filterBy == "name" {
		req.ParseForm()
		names = req.Form["name"]
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	response := generateTests(filterBy, names, current, previous)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		generichtml.PrintStatusMessage(w, http.StatusInternalServerError, fmt.Sprintf("could not print test results: %s", err))
	}
}