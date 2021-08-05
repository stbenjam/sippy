package api

import (
	"fmt"
	"net/http"

	sippyprocessingv1 "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/html/installhtml"
)

func PrintUpgradeJSONReport(w http.ResponseWriter, req *http.Request, report, prevReport sippyprocessingv1.TestReport, numDays int, release string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	fmt.Fprint(w, installhtml.UpgradeOperatorTests("json", report, prevReport))
}
