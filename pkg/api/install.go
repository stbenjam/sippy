package api

import (
	"fmt"
	sippyprocessingv1 "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/html/installhtml"
	"net/http"
)


func PrintInstallJSONReport(w http.ResponseWriter, req *http.Request, report, prevReport sippyprocessingv1.TestReport, numDays int, release string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	fmt.Fprint(w, installhtml.InstallOperatorTests("json", report, prevReport))
}