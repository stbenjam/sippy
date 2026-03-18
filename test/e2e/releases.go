package e2e

import (
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"

	"github.com/openshift/sippy/pkg/apis/api"
	"github.com/openshift/sippy/test/e2e/util"
)

var _ = ginkgo.Describe("Releases API", func() {
	ginkgo.It("should return releases", func() {
		var releases api.Releases
		err := util.SippyGet("/api/releases", &releases)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(releases.Releases).NotTo(gomega.BeEmpty())
	})

	ginkgo.It("should return release health", func() {
		var health api.Health
		err := util.SippyGet("/api/health?release="+util.Release, &health)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		gomega.Expect(health.Indicators["bootstrap"].CurrentRuns).To(gomega.BeNumerically(">", 0))
		gomega.Expect(health.Indicators["infrastructure"].CurrentRuns).To(gomega.BeNumerically(">", 0))
		gomega.Expect(health.Indicators["install"].CurrentRuns).To(gomega.BeNumerically(">", 0))
		gomega.Expect(health.Indicators["installConfig"].CurrentRuns).To(gomega.BeNumerically(">", 0))
		gomega.Expect(health.Indicators["installOther"].CurrentRuns).To(gomega.BeNumerically(">", 0))
		gomega.Expect(health.Indicators["tests"].CurrentRuns).To(gomega.BeNumerically(">", 0))
		gomega.Expect(health.Indicators["upgrade"].CurrentRuns).To(gomega.BeNumerically(">", 0))
		gomega.Expect(health.LastUpdated.IsZero()).To(gomega.BeFalse())
	})
})
