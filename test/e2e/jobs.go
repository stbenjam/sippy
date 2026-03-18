package e2e

import (
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"

	"github.com/openshift/sippy/pkg/apis/api"
	"github.com/openshift/sippy/test/e2e/util"
)

var _ = ginkgo.Describe("Jobs API", func() {
	ginkgo.It("should return jobs", func() {
		var jobs []api.Job
		err := util.SippyGet("/api/jobs?release="+util.Release, &jobs)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(jobs).NotTo(gomega.BeEmpty())
	})
})
