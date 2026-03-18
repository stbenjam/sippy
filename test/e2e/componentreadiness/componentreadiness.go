package componentreadiness

import (
	"fmt"

	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"

	"github.com/openshift/sippy/pkg/apis/api/componentreport"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crview"
	"github.com/openshift/sippy/test/e2e/util"
)

var _ = ginkgo.Describe("Component Readiness Views", func() {
	ginkgo.It("should return views with report data", func() {
		var views []crview.View
		err := util.SippyGet("/api/component_readiness/views", &views)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(views).NotTo(gomega.BeEmpty(), "no views returned, check server cli params")

		var report componentreport.ComponentReport
		err = util.SippyGet(fmt.Sprintf("/api/component_readiness?view=%s", views[0].Name), &report)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		// We expect over 50 components at time of writing, asserting 25 should be safe
		gomega.Expect(len(report.Rows)).To(gomega.BeNumerically(">", 25), "component report does not have rows we would expect")
	})
})
