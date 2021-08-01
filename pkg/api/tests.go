package api

import (
	"encoding/json"
	"fmt"
	v1 "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/html/generichtml"
	"net/http"
)

func PrintTestsReport(w http.ResponseWriter, current []v1.FailingTestResult, previous []v1.FailingTestResult) {
	response := summaryAllTests(current, previous)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		generichtml.PrintStatusMessage(w, http.StatusInternalServerError, fmt.Sprintf("could not print test results: %s", err))
	}
}