package bugs

import (
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"

	sippyUtil "github.com/openshift/sippy/pkg/util"
	"github.com/openshift/sippy/test/e2e/util"
)

var _ = ginkgo.Describe("File Bug API", func() {
	ginkgo.It("should successfully create a bug with all required fields", func() {
		bugRequest := sippyUtil.FileBugRequest{
			Summary:         "Test bug summary",
			Description:     "Test bug description with details",
			AffectsVersions: []string{"4.14", "4.15"},
			ComponentID:     "12345",
			Components:      []string{"Authentication"},
			Labels:          []string{"test-label"},
		}

		var bugResponse sippyUtil.FileBugResponse
		err := util.SippyPost("/api/component_readiness/bugs", &bugRequest, &bugResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(bugResponse.Success).To(gomega.BeTrue())
		gomega.Expect(bugResponse.DryRun).To(gomega.BeTrue(), "should be dry run when no jira client is configured")
		gomega.Expect(bugResponse.JiraKey).To(gomega.Equal("OCPBUGS-1234"))
		gomega.Expect(bugResponse.JiraURL).To(gomega.Equal("https://issues.redhat.com/browse/OCPBUGS-1234"))
	})

	ginkgo.It("should successfully create a bug with component ID", func() {
		bugRequest := sippyUtil.FileBugRequest{
			Summary:         "Test bug with component ID",
			Description:     "Test bug description",
			AffectsVersions: []string{"4.14"},
			ComponentID:     "12345",
		}

		var bugResponse sippyUtil.FileBugResponse
		err := util.SippyPost("/api/component_readiness/bugs", &bugRequest, &bugResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(bugResponse.Success).To(gomega.BeTrue())
		gomega.Expect(bugResponse.DryRun).To(gomega.BeTrue())
		gomega.Expect(bugResponse.JiraKey).To(gomega.Equal("OCPBUGS-1234"))
	})

	ginkgo.It("should return validation error for missing summary", func() {
		bugRequest := sippyUtil.FileBugRequest{
			Description:     "Test bug description",
			AffectsVersions: []string{"4.14"},
			Components:      []string{"Authentication"},
		}

		var bugResponse sippyUtil.FileBugResponse
		err := util.SippyPost("/api/component_readiness/bugs", &bugRequest, &bugResponse)
		gomega.Expect(err).To(gomega.HaveOccurred())
		gomega.Expect(err.Error()).To(gomega.ContainSubstring("Summary is required"))
	})

	ginkgo.It("should return validation error for missing description", func() {
		bugRequest := sippyUtil.FileBugRequest{
			Summary:         "Test bug summary",
			AffectsVersions: []string{"4.14"},
			Components:      []string{"Authentication"},
		}

		var bugResponse sippyUtil.FileBugResponse
		err := util.SippyPost("/api/component_readiness/bugs", &bugRequest, &bugResponse)
		gomega.Expect(err).To(gomega.HaveOccurred())
		gomega.Expect(err.Error()).To(gomega.ContainSubstring("Description is required"))
	})

	ginkgo.It("should return validation error for missing affects versions", func() {
		bugRequest := sippyUtil.FileBugRequest{
			Summary:     "Test bug summary",
			Description: "Test bug description",
			Components:  []string{"Authentication"},
		}

		var bugResponse sippyUtil.FileBugResponse
		err := util.SippyPost("/api/component_readiness/bugs", &bugRequest, &bugResponse)
		gomega.Expect(err).To(gomega.HaveOccurred())
		gomega.Expect(err.Error()).To(gomega.ContainSubstring("AffectsVersions is required"))
	})

	ginkgo.It("should return validation error for missing components and component ID", func() {
		bugRequest := sippyUtil.FileBugRequest{
			Summary:         "Test bug summary",
			Description:     "Test bug description",
			AffectsVersions: []string{"4.14"},
		}

		var bugResponse sippyUtil.FileBugResponse
		err := util.SippyPost("/api/component_readiness/bugs", &bugRequest, &bugResponse)
		gomega.Expect(err).To(gomega.HaveOccurred())
		gomega.Expect(err.Error()).To(gomega.ContainSubstring("At least one Component is required"))
	})

	ginkgo.It("should return multiple validation errors when all fields are missing", func() {
		bugRequest := sippyUtil.FileBugRequest{}

		var bugResponse sippyUtil.FileBugResponse
		err := util.SippyPost("/api/component_readiness/bugs", &bugRequest, &bugResponse)
		gomega.Expect(err).To(gomega.HaveOccurred())

		errorMsg := err.Error()
		gomega.Expect(errorMsg).To(gomega.ContainSubstring("Summary is required"))
		gomega.Expect(errorMsg).To(gomega.ContainSubstring("Description is required"))
		gomega.Expect(errorMsg).To(gomega.ContainSubstring("AffectsVersions is required"))
		gomega.Expect(errorMsg).To(gomega.ContainSubstring("At least one Component is required"))
	})
})
