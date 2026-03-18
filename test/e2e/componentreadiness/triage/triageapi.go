package triage

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/lib/pq"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"

	"github.com/openshift/sippy/pkg/api/componentreadiness"
	"github.com/openshift/sippy/pkg/apis/api/componentreport"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crtest"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crview"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/reqopts"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/testdetails"
	"github.com/openshift/sippy/pkg/db"
	"github.com/openshift/sippy/pkg/db/models"
	"github.com/openshift/sippy/pkg/sippyserver"
	"github.com/openshift/sippy/test/e2e/util"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

var view = crview.View{
	Name: fmt.Sprintf("%s-main", util.Release),
	BaseRelease: reqopts.RelativeRelease{
		Release: reqopts.Release{
			Name: util.BaseRelease,
		},
	},
	SampleRelease: reqopts.RelativeRelease{
		Release: reqopts.Release{
			Name: util.Release,
		},
	},
}

func cleanupAllTriages(dbc *db.DB) {
	dbc.DB.Exec("DELETE FROM triage_regressions WHERE 1=1")
	res := dbc.DB.Where("1 = 1").Delete(&models.Triage{})
	if res.Error != nil {
		log.Errorf("error deleting triage records: %v", res.Error)
	}
}

var _ = ginkgo.Describe("Triage API", func() {
	var dbc *db.DB
	var tracker componentreadiness.RegressionStore
	var jiraBug *models.Bug
	var testRegression1, testRegression2 *models.TestRegression

	ginkgo.BeforeEach(func() {
		dbc = util.MustCreateE2EPostgresConnection()
		tracker = componentreadiness.NewPostgresRegressionStore(dbc, nil)

		jiraBug = createBug(dbc.DB)
		testRegression1 = createTestRegression(tracker, view, "faketestid")
		testRegression2 = createTestRegression(tracker, view, "faketestid2")
	})

	ginkgo.AfterEach(func() {
		dbc.DB.Delete(jiraBug)
		dbc.DB.Delete(testRegression1)
		dbc.DB.Delete(testRegression2)
	})

	ginkgo.It("create requires a valid triage type", func() {
		defer cleanupAllTriages(dbc)
		triage1 := models.Triage{
			URL: jiraBug.URL,
			Regressions: []models.TestRegression{
				{ID: testRegression1.ID},
			},
		}

		var triageResponse models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triage1, &triageResponse)
		gomega.Expect(err).To(gomega.HaveOccurred())

		triage1.Type = "fake"
		err = util.SippyPost("/api/component_readiness/triages", &triage1, &triageResponse)
		gomega.Expect(err).To(gomega.HaveOccurred())
	})

	ginkgo.It("create generates audit_log record", func() {
		defer cleanupAllTriages(dbc)
		triage1 := models.Triage{
			URL: jiraBug.URL,
			Regressions: []models.TestRegression{
				{ID: testRegression1.ID},
			},
			Type: "test",
		}

		var triageResponse models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triage1, &triageResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		var auditLog models.AuditLog
		res := dbc.DB.
			Where("table_name = ?", "triage").
			Where("row_id = ?", triageResponse.ID).
			First(&auditLog)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())

		gomega.Expect(auditLog.Operation).To(gomega.Equal(string(models.Create)))
		gomega.Expect(auditLog.User).To(gomega.Equal("developer"))
		gomega.Expect(auditLog.NewData).NotTo(gomega.BeEmpty(), "NewData should contain the created triage record")

		var auditedTriage models.Triage
		err = json.Unmarshal(auditLog.NewData, &auditedTriage)
		gomega.Expect(err).NotTo(gomega.HaveOccurred(), "NewData should be valid JSON")
		assertTriageDataMatches(triageResponse, auditedTriage, "NewData")
	})

	ginkgo.It("get returns HATEOAS links", func() {
		defer cleanupAllTriages(dbc)
		triageResponse := createAndValidateTriageRecord(jiraBug.URL, testRegression1)

		gomega.Expect(triageResponse.Links["self"]).NotTo(gomega.BeEmpty())
		gomega.Expect(triageResponse.Links["self"]).To(gomega.Equal(
			fmt.Sprintf("http://%s:%s/api/component_readiness/triages/%d", os.Getenv("SIPPY_ENDPOINT"), os.Getenv("SIPPY_API_PORT"), triageResponse.ID)))
		gomega.Expect(triageResponse.Links["potential_matches"]).NotTo(gomega.BeEmpty())
		gomega.Expect(triageResponse.Links["potential_matches"]).To(gomega.Equal(
			fmt.Sprintf("http://%s:%s/api/component_readiness/triages/%d/matches", os.Getenv("SIPPY_ENDPOINT"), os.Getenv("SIPPY_API_PORT"), triageResponse.ID)))
		gomega.Expect(triageResponse.Links["audit_logs"]).NotTo(gomega.BeEmpty())
		gomega.Expect(triageResponse.Links["audit_logs"]).To(gomega.Equal(
			fmt.Sprintf("http://%s:%s/api/component_readiness/triages/%d/audit", os.Getenv("SIPPY_ENDPOINT"), os.Getenv("SIPPY_API_PORT"), triageResponse.ID)))
	})

	ginkgo.It("get with expanded regressions", func() {
		defer cleanupAllTriages(dbc)

		r := createTestRegressionWithDetails(tracker, view, "expanded-test-1", "component-expand", "capability-expand", "TestExpanded1", nil, crtest.ExtremeRegression)
		defer dbc.DB.Delete(r.Regression)

		r2 := createTestRegressionWithDetails(tracker, view, "expanded-test-2", "component-expand", "capability-expand", "TestExpanded2", nil, crtest.SignificantRegression)
		defer dbc.DB.Delete(r2.Regression)

		triage := models.Triage{
			URL:  jiraBug.URL,
			Type: models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				{ID: r.Regression.ID},
				{ID: r2.Regression.ID},
			},
		}

		var triageResponse models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triage, &triageResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(triageResponse.Regressions).To(gomega.HaveLen(2))

		cache, err := util.NewE2ECacheManipulator(util.Release)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		defer cache.Close()

		err = cache.AddTestRegressionsToReport([]componentreport.ReportTestSummary{r, r2})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		var expandedTriage sippyserver.ExpandedTriage
		err = util.SippyGet(fmt.Sprintf("/api/component_readiness/triages/%d?view=%s-main&expand=regressions", triageResponse.ID, util.Release), &expandedTriage)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		gomega.Expect(expandedTriage.Triage).NotTo(gomega.BeNil())
		gomega.Expect(expandedTriage.Triage.ID).To(gomega.Equal(triageResponse.ID))
		expectedViewKey := view.Name
		gomega.Expect(expandedTriage.RegressedTests).To(gomega.HaveKey(expectedViewKey))
		regressedTestsForView := expandedTriage.RegressedTests[expectedViewKey]
		gomega.Expect(regressedTestsForView).To(gomega.HaveLen(2))

		statusMap := make(map[uint]crtest.Status)
		for _, regressedTest := range regressedTestsForView {
			if regressedTest != nil && regressedTest.Regression != nil {
				statusMap[regressedTest.Regression.ID] = regressedTest.TestComparison.ReportStatus
			}
		}

		gomega.Expect(statusMap[r.Regression.ID]).To(gomega.Equal(crtest.ExtremeTriagedRegression))
		gomega.Expect(statusMap[r2.Regression.ID]).To(gomega.Equal(crtest.SignificantTriagedRegression))
	})

	ginkgo.It("list returns triage records with regression details and HATEOAS links", func() {
		defer cleanupAllTriages(dbc)
		triageResponse := createAndValidateTriageRecord(jiraBug.URL, testRegression1)

		var allTriages []models.Triage
		err := util.SippyGet("/api/component_readiness/triages", &allTriages)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		var foundTriage *models.Triage
		for i, triage := range allTriages {
			if triage.ID == triageResponse.ID {
				foundTriage = &allTriages[i]
				break
			}
		}
		gomega.Expect(foundTriage).NotTo(gomega.BeNil(), "expected triage was not found in list")
		gomega.Expect(foundTriage.Regressions[0].TestName).To(gomega.Equal(testRegression1.TestName))

		for _, triage := range allTriages {
			gomega.Expect(triage.Links["self"]).NotTo(gomega.BeEmpty())
			gomega.Expect(triage.Links["self"]).To(gomega.Equal(
				fmt.Sprintf("http://%s:%s/api/component_readiness/triages/%d", os.Getenv("SIPPY_ENDPOINT"), os.Getenv("SIPPY_API_PORT"), triage.ID)))
			gomega.Expect(triage.Links["potential_matches"]).NotTo(gomega.BeEmpty())
			gomega.Expect(triage.Links["audit_logs"]).NotTo(gomega.BeEmpty())
		}
	})

	ginkgo.It("update to add regression", func() {
		defer cleanupAllTriages(dbc)
		triageResponse := createAndValidateTriageRecord(jiraBug.URL, testRegression1)

		var triageResponse2 models.Triage
		triageResponse.Regressions = append(triageResponse.Regressions, models.TestRegression{ID: testRegression2.ID})
		err := util.SippyPut(fmt.Sprintf("/api/component_readiness/triages/%d", triageResponse.ID), &triageResponse, &triageResponse2)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(triageResponse2.Regressions).To(gomega.HaveLen(2))
		gomega.Expect(triageResponse2.CreatedAt).To(gomega.Equal(triageResponse.CreatedAt))
		gomega.Expect(triageResponse2.UpdatedAt).NotTo(gomega.Equal(triageResponse.UpdatedAt))

		gomega.Expect(triageResponse2.Links["self"]).NotTo(gomega.BeEmpty())
		gomega.Expect(triageResponse2.Links["potential_matches"]).NotTo(gomega.BeEmpty())
		gomega.Expect(triageResponse2.Links["audit_logs"]).NotTo(gomega.BeEmpty())
	})

	ginkgo.It("update to remove a regression", func() {
		defer cleanupAllTriages(dbc)

		triage := models.Triage{
			URL:  jiraBug.URL,
			Type: models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				{ID: testRegression1.ID},
				{ID: testRegression2.ID},
			},
		}

		var triageResponse models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triage, &triageResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(triageResponse.Regressions).To(gomega.HaveLen(2))

		triageResponse.Regressions = []models.TestRegression{{ID: testRegression1.ID}}
		var triageResponse2 models.Triage
		err = util.SippyPut(fmt.Sprintf("/api/component_readiness/triages/%d", triageResponse.ID), &triageResponse, &triageResponse2)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(triageResponse2.Regressions).To(gomega.HaveLen(1))
		gomega.Expect(triageResponse2.Regressions[0].ID).To(gomega.Equal(testRegression1.ID))
		gomega.Expect(triageResponse2.CreatedAt).To(gomega.BeTemporally("~", triageResponse.CreatedAt, time.Second))
		gomega.Expect(triageResponse2.UpdatedAt).NotTo(gomega.Equal(triageResponse.UpdatedAt))
	})

	ginkgo.It("update to remove all regressions", func() {
		defer cleanupAllTriages(dbc)
		triageResponse := createAndValidateTriageRecord(jiraBug.URL, testRegression1)

		var triageResponse2 models.Triage
		triageResponse.Regressions = []models.TestRegression{}
		err := util.SippyPut(fmt.Sprintf("/api/component_readiness/triages/%d", triageResponse.ID), &triageResponse, &triageResponse2)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(triageResponse2.Regressions).To(gomega.BeEmpty())
	})

	ginkgo.It("update to resolve triage sets resolution reason to user", func() {
		defer cleanupAllTriages(dbc)
		triageResponse := createAndValidateTriageRecord(jiraBug.URL, testRegression1)

		resolvedTime := time.Now()
		triageResponse.Resolved = sql.NullTime{Time: resolvedTime, Valid: true}

		var updateResponse models.Triage
		err := util.SippyPut(fmt.Sprintf("/api/component_readiness/triages/%d", triageResponse.ID), &triageResponse, &updateResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(updateResponse.Resolved.Valid).To(gomega.BeTrue())
		gomega.Expect(updateResponse.Resolved.Time).To(gomega.BeTemporally("~", resolvedTime, time.Second))
		gomega.Expect(updateResponse.ResolutionReason).To(gomega.Equal(models.User))
	})

	ginkgo.It("update fails if resource has no ID", func() {
		defer cleanupAllTriages(dbc)
		triageResponse := createAndValidateTriageRecord(jiraBug.URL, testRegression1)

		var triageResponse2 models.Triage
		triageResponse.ID = 0
		err := util.SippyPut(fmt.Sprintf("/api/component_readiness/triages/%d", triageResponse.ID), &triageResponse, &triageResponse2)
		gomega.Expect(err).To(gomega.HaveOccurred())
	})

	ginkgo.It("update fails if URL has no ID", func() {
		defer cleanupAllTriages(dbc)
		triageResponse := createAndValidateTriageRecord(jiraBug.URL, testRegression1)

		var triageResponse2 models.Triage
		err := util.SippyPut("/api/component_readiness/triages", &triageResponse, &triageResponse2)
		gomega.Expect(err).To(gomega.HaveOccurred())
	})

	ginkgo.It("update fails if URL ID and resource ID do not match", func() {
		defer cleanupAllTriages(dbc)
		triageResponse := createAndValidateTriageRecord(jiraBug.URL, testRegression1)

		var triageResponse2 models.Triage
		err := util.SippyPut("/api/component_readiness/triages/128736182736128736", &triageResponse, &triageResponse2)
		gomega.Expect(err).To(gomega.HaveOccurred())
	})

	ginkgo.It("update generates audit_log record", func() {
		defer cleanupAllTriages(dbc)
		triageResponse := createAndValidateTriageRecord(jiraBug.URL, testRegression1)
		originalTriage := deepCopyTriage(triageResponse)

		triageResponse.Regressions = append(triageResponse.Regressions, models.TestRegression{ID: testRegression2.ID})
		triageResponse.Description = "updated description"
		var triageResponse2 models.Triage
		err := util.SippyPut(fmt.Sprintf("/api/component_readiness/triages/%d", triageResponse.ID), &triageResponse, &triageResponse2)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		var auditLog models.AuditLog
		res := dbc.DB.
			Where("table_name = ?", "triage").
			Where("operation = ?", models.Update).
			Where("row_id = ?", triageResponse.ID).
			First(&auditLog)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())

		gomega.Expect(auditLog.User).To(gomega.Equal("developer"))
		gomega.Expect(auditLog.NewData).NotTo(gomega.BeEmpty())
		gomega.Expect(auditLog.OldData).NotTo(gomega.BeEmpty())

		var newTriageData models.Triage
		err = json.Unmarshal(auditLog.NewData, &newTriageData)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		assertTriageDataMatches(triageResponse2, newTriageData, "NewData")

		var oldTriageData models.Triage
		err = json.Unmarshal(auditLog.OldData, &oldTriageData)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		assertTriageDataMatches(originalTriage, oldTriageData, "OldData")
	})

	ginkgo.It("delete generates audit_log record", func() {
		defer cleanupAllTriages(dbc)
		triageResponse := createAndValidateTriageRecord(jiraBug.URL, testRegression1)
		originalTriage := deepCopyTriage(triageResponse)

		err := util.SippyDelete(fmt.Sprintf("/api/component_readiness/triages/%d", triageResponse.ID))
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		var auditLog models.AuditLog
		res := dbc.DB.
			Where("table_name = ?", "triage").
			Where("operation = ?", models.Delete).
			Where("row_id = ?", triageResponse.ID).
			First(&auditLog)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())

		gomega.Expect(auditLog.User).To(gomega.Equal("developer"))
		gomega.Expect(auditLog.OldData).NotTo(gomega.BeEmpty())
		gomega.Expect(auditLog.NewData).To(gomega.BeEmpty())

		var oldTriageData models.Triage
		err = json.Unmarshal(auditLog.OldData, &oldTriageData)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		assertTriageDataMatches(originalTriage, oldTriageData, "OldData")
	})

	ginkgo.It("audit endpoint returns full lifecycle operations", func() {
		defer cleanupAllTriages(dbc)

		triage := models.Triage{
			URL:         "https://issues.redhat.com/browse/OCPBUGS-8888",
			Description: "Initial description for audit test",
			Type:        models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				{ID: testRegression1.ID},
			},
		}

		var triageResponse models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triage, &triageResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(triageResponse.ID).To(gomega.BeNumerically(">", 0))

		time.Sleep(10 * time.Millisecond)

		triageResponse.Description = "Updated description for audit test"
		triageResponse.Type = models.TriageTypeCIInfra
		triageResponse.Regressions = append(triageResponse.Regressions, models.TestRegression{ID: testRegression2.ID})

		var updatedTriageResponse models.Triage
		err = util.SippyPut(fmt.Sprintf("/api/component_readiness/triages/%d", triageResponse.ID), &triageResponse, &updatedTriageResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		time.Sleep(10 * time.Millisecond)

		err = util.SippyDelete(fmt.Sprintf("/api/component_readiness/triages/%d", triageResponse.ID))
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		var auditLogs []componentreadiness.TriageAuditLog
		err = util.SippyGet(fmt.Sprintf("/api/component_readiness/triages/%d/audit", triageResponse.ID), &auditLogs)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(auditLogs).To(gomega.HaveLen(3))

		gomega.Expect(auditLogs[0].CreatedAt.After(auditLogs[1].CreatedAt)).To(gomega.BeTrue())
		gomega.Expect(auditLogs[1].CreatedAt.After(auditLogs[2].CreatedAt)).To(gomega.BeTrue())

		// DELETE
		deleteLog := auditLogs[0]
		gomega.Expect(deleteLog.Operation).To(gomega.Equal("DELETE"))
		gomega.Expect(deleteLog.User).To(gomega.Equal("developer"))
		gomega.Expect(deleteLog.Changes).NotTo(gomega.BeEmpty())

		deleteChangesByField := make(map[string]componentreadiness.FieldChange)
		for _, change := range deleteLog.Changes {
			deleteChangesByField[change.FieldName] = change
		}
		gomega.Expect(deleteChangesByField).To(gomega.HaveKey("url"))
		gomega.Expect(deleteChangesByField["url"].Original).To(gomega.Equal("https://issues.redhat.com/browse/OCPBUGS-8888"))
		gomega.Expect(deleteChangesByField["url"].Modified).To(gomega.BeEmpty())
		gomega.Expect(deleteChangesByField).To(gomega.HaveKey("description"))
		gomega.Expect(deleteChangesByField).To(gomega.HaveKey("type"))
		gomega.Expect(deleteChangesByField["type"].Original).To(gomega.Equal("ci-infra"))

		// UPDATE
		updateLog := auditLogs[1]
		gomega.Expect(updateLog.Operation).To(gomega.Equal("UPDATE"))
		gomega.Expect(updateLog.User).To(gomega.Equal("developer"))
		gomega.Expect(updateLog.Changes).NotTo(gomega.BeEmpty())

		updateChangesByField := make(map[string]componentreadiness.FieldChange)
		for _, change := range updateLog.Changes {
			updateChangesByField[change.FieldName] = change
		}
		gomega.Expect(updateChangesByField).To(gomega.HaveKey("description"))
		gomega.Expect(updateChangesByField["description"].Original).To(gomega.Equal("Initial description for audit test"))
		gomega.Expect(updateChangesByField["description"].Modified).To(gomega.Equal("Updated description for audit test"))
		gomega.Expect(updateChangesByField).To(gomega.HaveKey("type"))
		gomega.Expect(updateChangesByField["type"].Original).To(gomega.Equal("product"))
		gomega.Expect(updateChangesByField["type"].Modified).To(gomega.Equal("ci-infra"))
		gomega.Expect(updateChangesByField).To(gomega.HaveKey("regressions"))

		// CREATE
		createLog := auditLogs[2]
		gomega.Expect(createLog.Operation).To(gomega.Equal("CREATE"))
		gomega.Expect(createLog.User).To(gomega.Equal("developer"))
		gomega.Expect(createLog.Changes).NotTo(gomega.BeEmpty())

		createChangesByField := make(map[string]componentreadiness.FieldChange)
		for _, change := range createLog.Changes {
			createChangesByField[change.FieldName] = change
		}
		gomega.Expect(createChangesByField).To(gomega.HaveKey("url"))
		gomega.Expect(createChangesByField["url"].Original).To(gomega.BeEmpty())
		gomega.Expect(createChangesByField["url"].Modified).To(gomega.Equal("https://issues.redhat.com/browse/OCPBUGS-8888"))
		gomega.Expect(createChangesByField).To(gomega.HaveKey("description"))
		gomega.Expect(createChangesByField).To(gomega.HaveKey("type"))
		gomega.Expect(createChangesByField["type"].Modified).To(gomega.Equal("product"))
		gomega.Expect(createChangesByField).To(gomega.HaveKey("regressions"))

		gomega.Expect(createLog.CreatedAt.Before(updateLog.CreatedAt)).To(gomega.BeTrue())
		gomega.Expect(updateLog.CreatedAt.Before(deleteLog.CreatedAt)).To(gomega.BeTrue())

		baseURL := fmt.Sprintf("http://%s:%s", os.Getenv("SIPPY_ENDPOINT"), os.Getenv("SIPPY_API_PORT"))
		for _, auditLog := range auditLogs {
			gomega.Expect(auditLog.Links["self"]).To(gomega.Equal(
				fmt.Sprintf("%s/api/component_readiness/triages/%d/audit", baseURL, triageResponse.ID)))
			gomega.Expect(auditLog.Links["triage"]).To(gomega.Equal(
				fmt.Sprintf("%s/api/component_readiness/triages/%d", baseURL, triageResponse.ID)))
		}
	})
})

var _ = ginkgo.Describe("Regression API", func() {
	var dbc *db.DB
	var tracker componentreadiness.RegressionStore
	var testRegression1, testRegression2 *models.TestRegression
	var jiraBug *models.Bug

	ginkgo.BeforeEach(func() {
		dbc = util.MustCreateE2EPostgresConnection()
		tracker = componentreadiness.NewPostgresRegressionStore(dbc, nil)

		testRegression1 = createTestRegression(tracker, view, "faketestid1")
		testRegression2 = createTestRegression(tracker, view, "faketestid2")
		jiraBug = createBug(dbc.DB)
	})

	ginkgo.AfterEach(func() {
		dbc.DB.Delete(testRegression1)
		dbc.DB.Delete(testRegression2)
		dbc.DB.Delete(jiraBug)
	})

	ginkgo.It("list regressions with HATEOAS links", func() {
		defer cleanupAllTriages(dbc)
		_ = createAndValidateTriageRecord(jiraBug.URL, testRegression1)

		release := view.SampleRelease.Release.Name
		var allRegressions []models.TestRegression
		err := util.SippyGet("/api/component_readiness/regressions?release="+release, &allRegressions)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		var foundRegression *models.TestRegression
		for i, regression := range allRegressions {
			if regression.ID == testRegression1.ID {
				foundRegression = &allRegressions[i]
				break
			}
		}
		gomega.Expect(foundRegression).NotTo(gomega.BeNil())
		gomega.Expect(foundRegression.TestName).To(gomega.Equal(testRegression1.TestName))
		gomega.Expect(foundRegression.Links).NotTo(gomega.BeNil())
		gomega.Expect(foundRegression.Links).To(gomega.HaveKey("test_details"))
		gomega.Expect(foundRegression.Links["test_details"]).To(gomega.ContainSubstring(
			fmt.Sprintf("http://%s:%s/api/component_readiness/test_details", os.Getenv("SIPPY_ENDPOINT"), os.Getenv("SIPPY_API_PORT"))))
		gomega.Expect(foundRegression.Links["test_details"]).To(gomega.ContainSubstring("testId="))
	})

	ginkgo.It("error when both view and release are specified", func() {
		defer cleanupAllTriages(dbc)
		var regressions []models.TestRegression
		err := util.SippyGet(fmt.Sprintf("/api/component_readiness/regressions?view=%s-main&release=%s", util.Release, util.Release), &regressions)
		gomega.Expect(err).To(gomega.HaveOccurred())
	})
})

var _ = ginkgo.Describe("Regression Potential Matching Triages", func() {
	var dbc *db.DB
	var tracker componentreadiness.RegressionStore
	var jiraBug *models.Bug

	var targetRegression, matchByNameRegression, matchByTimeRegression, noMatchRegression componentreport.ReportTestSummary
	commonFailureTime := time.Now().Add(-24 * time.Hour)
	differentFailureTime := time.Now().Add(-12 * time.Hour)

	ginkgo.BeforeEach(func() {
		dbc = util.MustCreateE2EPostgresConnection()
		tracker = componentreadiness.NewPostgresRegressionStore(dbc, nil)
		jiraBug = createBug(dbc.DB)

		targetRegression = createTestRegressionWithDetails(tracker, view, "target-test", "component-a", "capability-x", "TestTargetFunction", &commonFailureTime, crtest.ExtremeRegression)
		matchByNameRegression = createTestRegressionWithDetails(tracker, view, "match-name", "component-b", "capability-y", "TestTargetFunctin", &differentFailureTime, crtest.SignificantRegression)
		matchByTimeRegression = createTestRegressionWithDetails(tracker, view, "match-time", "component-c", "capability-z", "TestDifferentName", &commonFailureTime, crtest.ExtremeTriagedRegression)
		noMatchRegression = createTestRegressionWithDetails(tracker, view, "no-match", "component-d", "capability-w", "CompletelyDifferentTest", &differentFailureTime, crtest.NotSignificant)
	})

	ginkgo.AfterEach(func() {
		dbc.DB.Delete(targetRegression.Regression)
		dbc.DB.Delete(matchByNameRegression.Regression)
		dbc.DB.Delete(matchByTimeRegression.Regression)
		dbc.DB.Delete(noMatchRegression.Regression)
		dbc.DB.Delete(jiraBug)
	})

	ginkgo.It("find potential matching triages", func() {
		defer cleanupAllTriages(dbc)

		triage1 := models.Triage{
			URL:  jiraBug.URL,
			Type: models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				{ID: matchByNameRegression.Regression.ID},
			},
		}
		var triageResponse1 models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triage1, &triageResponse1)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		triage2 := models.Triage{
			URL:  jiraBug.URL,
			Type: models.TriageTypeCIInfra,
			Regressions: []models.TestRegression{
				{ID: matchByTimeRegression.Regression.ID},
			},
		}
		var triageResponse2 models.Triage
		err = util.SippyPost("/api/component_readiness/triages", &triage2, &triageResponse2)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		triageNoMatch := models.Triage{
			URL:  jiraBug.URL,
			Type: models.TriageTypeTest,
			Regressions: []models.TestRegression{
				{ID: noMatchRegression.Regression.ID},
			},
		}
		var triageResponseNoMatch models.Triage
		err = util.SippyPost("/api/component_readiness/triages", &triageNoMatch, &triageResponseNoMatch)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		var potentialMatches []componentreadiness.PotentialMatchingTriage
		endpoint := fmt.Sprintf("/api/component_readiness/regressions/%d/matches", targetRegression.Regression.ID)
		err = util.SippyGet(endpoint, &potentialMatches)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(potentialMatches).To(gomega.HaveLen(2))

		for _, match := range potentialMatches {
			gomega.Expect(match.Links).To(gomega.HaveKey("self"))
		}

		triagesByID := make(map[uint]componentreadiness.PotentialMatchingTriage)
		for _, match := range potentialMatches {
			triagesByID[match.Triage.ID] = match
		}

		nameMatch, found := triagesByID[triageResponse1.ID]
		gomega.Expect(found).To(gomega.BeTrue(), "Should find triage with similar named test")
		gomega.Expect(nameMatch.SimilarlyNamedTests).To(gomega.HaveLen(1))
		gomega.Expect(nameMatch.SimilarlyNamedTests[0].EditDistance).To(gomega.Equal(1))
		gomega.Expect(nameMatch.ConfidenceLevel).To(gomega.Equal(5))

		timeMatch, found := triagesByID[triageResponse2.ID]
		gomega.Expect(found).To(gomega.BeTrue(), "Should find triage with same failure time")
		gomega.Expect(timeMatch.SameLastFailures).To(gomega.HaveLen(1))
		gomega.Expect(timeMatch.ConfidenceLevel).To(gomega.Equal(1))

		_, found = triagesByID[triageResponseNoMatch.ID]
		gomega.Expect(found).To(gomega.BeFalse(), "Should not find triage with no matching criteria")
	})

	ginkgo.It("no potential matches found", func() {
		defer cleanupAllTriages(dbc)

		triage := models.Triage{
			URL:  jiraBug.URL,
			Type: models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				{ID: noMatchRegression.Regression.ID},
			},
		}
		var triageResponse models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triage, &triageResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		var potentialMatches []componentreadiness.PotentialMatchingTriage
		endpoint := fmt.Sprintf("/api/component_readiness/regressions/%d/matches", targetRegression.Regression.ID)
		err = util.SippyGet(endpoint, &potentialMatches)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(potentialMatches).To(gomega.BeEmpty())
	})

	ginkgo.It("resolved triage confidence level capped at 5", func() {
		defer cleanupAllTriages(dbc)

		exactMatchRegression := createTestRegressionWithDetails(tracker, view, "exact-match", "component-e", "capability-v", "TestTargetFunction", &differentFailureTime, crtest.ExtremeRegression)
		defer dbc.DB.Delete(exactMatchRegression.Regression)

		triageExactMatch := models.Triage{
			URL:  jiraBug.URL,
			Type: models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				{ID: exactMatchRegression.Regression.ID},
			},
		}
		var triageResponseExactMatch models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triageExactMatch, &triageResponseExactMatch)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		resolvedTime := time.Now()
		triageResponseExactMatch.Resolved = sql.NullTime{Time: resolvedTime, Valid: true}
		var updateResponse models.Triage
		err = util.SippyPut(fmt.Sprintf("/api/component_readiness/triages/%d", triageResponseExactMatch.ID), &triageResponseExactMatch, &updateResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(updateResponse.Resolved.Valid).To(gomega.BeTrue())

		var potentialMatches []componentreadiness.PotentialMatchingTriage
		endpoint := fmt.Sprintf("/api/component_readiness/regressions/%d/matches", targetRegression.Regression.ID)
		err = util.SippyGet(endpoint, &potentialMatches)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(potentialMatches).To(gomega.HaveLen(1))

		triagesByID := make(map[uint]componentreadiness.PotentialMatchingTriage)
		for _, match := range potentialMatches {
			triagesByID[match.Triage.ID] = match
		}

		resolvedMatch, found := triagesByID[triageResponseExactMatch.ID]
		gomega.Expect(found).To(gomega.BeTrue())
		gomega.Expect(resolvedMatch.SimilarlyNamedTests).To(gomega.HaveLen(1))
		gomega.Expect(resolvedMatch.SimilarlyNamedTests[0].EditDistance).To(gomega.Equal(0))
		gomega.Expect(resolvedMatch.ConfidenceLevel).To(gomega.Equal(5), "Confidence should be capped at 5 for resolved triage")
	})
})

var _ = ginkgo.Describe("Triage Raw DB", func() {
	var dbc *db.DB
	var tracker componentreadiness.RegressionStore
	var testRegression *models.TestRegression

	ginkgo.BeforeEach(func() {
		dbc = util.MustCreateE2EPostgresConnection()
		tracker = componentreadiness.NewPostgresRegressionStore(dbc, nil)
		testRegression = createTestRegression(tracker, view, "faketestid")
	})

	ginkgo.AfterEach(func() {
		dbc.DB.Delete(testRegression)
	})

	ginkgo.It("test Triage model in postgres", func() {
		defer cleanupAllTriages(dbc)
		dbWithContext := dbc.DB.WithContext(context.WithValue(context.TODO(), models.CurrentUserKey, "developer"))

		triage1 := models.Triage{
			URL: "http://myjira",
			Regressions: []models.TestRegression{
				*testRegression,
			},
		}
		res := dbWithContext.Create(&triage1)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		testRegression.Triages = append(testRegression.Triages, triage1)
		res = dbWithContext.Save(&testRegression)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())

		res = dbWithContext.First(&triage1, triage1.ID)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		gomega.Expect(triage1.Regressions).To(gomega.HaveLen(1))

		var lookupRegression models.TestRegression
		res = dbWithContext.First(&lookupRegression, testRegression.ID).Preload("Triages")
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		gomega.Expect(testRegression.Triages).To(gomega.HaveLen(1))

		openRegressions := make([]*models.TestRegression, 0)
		res = dbWithContext.
			Model(&models.TestRegression{}).
			Preload("Triages").
			Where("test_regressions.release = ?", view.SampleRelease.Name).
			Where("test_regressions.id = ?", testRegression.ID).
			Where("test_regressions.closed IS NULL").
			Find(&openRegressions)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		gomega.Expect(openRegressions).To(gomega.HaveLen(1))
		gomega.Expect(openRegressions[0].Triages).To(gomega.HaveLen(1))

		triage2 := models.Triage{
			URL: "http://myjira2",
			Regressions: []models.TestRegression{
				*testRegression,
			},
		}
		res = dbWithContext.Create(&triage2)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		testRegression.Triages = append(testRegression.Triages, triage2)
		res = dbWithContext.Save(&testRegression)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())

		res = dbWithContext.First(&testRegression, testRegression.ID).Preload("Triages")
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		gomega.Expect(testRegression.Triages).To(gomega.HaveLen(2))

		triage1.Regressions = []models.TestRegression{}
		res = dbWithContext.Save(&triage1)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		res = dbWithContext.First(&triage1, triage1.ID)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		gomega.Expect(triage1.Regressions).To(gomega.BeEmpty())
		res = dbWithContext.First(&lookupRegression, testRegression.ID)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
	})

	ginkgo.It("test Triage model Bug relationship", func() {
		defer cleanupAllTriages(dbc)
		dbWithContext := dbc.DB.WithContext(context.WithValue(context.TODO(), models.CurrentUserKey, "developer"))

		jiraBug := createBug(dbWithContext)
		defer dbWithContext.Delete(jiraBug)

		triage1 := models.Triage{
			URL: "http://myjira",
			Bug: jiraBug,
		}
		res := dbWithContext.Create(&triage1)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())

		res = dbWithContext.First(&triage1, triage1.ID)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		gomega.Expect(triage1.Bug.Key).To(gomega.Equal("MYBUGS-100"))
	})
})

var _ = ginkgo.Describe("Triage Potential Matching Regressions", func() {
	var dbc *db.DB
	var tracker componentreadiness.RegressionStore
	var testRegressions []componentreport.ReportTestSummary
	var cache *util.E2ECacheManipulator

	commonFailureTime := time.Now().Add(-24 * time.Hour)
	differentFailureTime := time.Now().Add(-12 * time.Hour)

	ginkgo.BeforeEach(func() {
		dbc = util.MustCreateE2EPostgresConnection()
		tracker = componentreadiness.NewPostgresRegressionStore(dbc, nil)

		testRegressions = make([]componentreport.ReportTestSummary, 10)

		testRegressions[0] = createTestRegressionWithDetails(tracker, view, "linked-test-1", "component-a", "capability-x", "TestSomething", &commonFailureTime, crtest.ExtremeRegression)
		uniqueFailureTime := time.Now().Add(-36 * time.Hour)
		testRegressions[1] = createTestRegressionWithDetails(tracker, view, "linked-test-2", "component-b", "capability-y", "TestAnotherOne", &uniqueFailureTime, crtest.SignificantRegression)
		testRegressions[2] = createTestRegressionWithDetails(tracker, view, "match-similar-name", "component-c", "capability-z", "TestSomthng", &differentFailureTime, crtest.ExtremeTriagedRegression)
		testRegressions[3] = createTestRegressionWithDetails(tracker, view, "match-same-failure", "component-d", "capability-w", "TestDifferent", &commonFailureTime, crtest.SignificantTriagedRegression)
		testRegressions[4] = createTestRegressionWithDetails(tracker, view, "match-both", "component-e", "capability-v", "TestAnoterOne", &commonFailureTime, crtest.FixedRegression)
		testRegressions[5] = createTestRegressionWithDetails(tracker, view, "match-name-only", "component-f", "capability-u", "TestSomthing", &differentFailureTime, crtest.MissingSample)
		testRegressions[6] = createTestRegressionWithDetails(tracker, view, "no-match-1", "component-g", "capability-t", "CompletelyDifferentTest", &differentFailureTime, crtest.NotSignificant)
		testRegressions[7] = createTestRegressionWithDetails(tracker, view, "no-match-2", "component-h", "capability-s", "VeryDifferentTestName", &differentFailureTime, crtest.MissingBasis)
		testRegressions[8] = createTestRegressionWithDetails(tracker, view, "match-failure-time", "component-i", "capability-r", "TestUnrelated", &commonFailureTime, crtest.MissingBasisAndSample)
		testRegressions[9] = createTestRegressionWithDetails(tracker, view, "match-similar-2", "component-j", "capability-q", "TestAnotheOne", &differentFailureTime, crtest.SignificantImprovement)

		var err error
		cache, err = util.NewE2ECacheManipulator(util.Release)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		err = cache.AddTestRegressionsToReport(testRegressions)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
	})

	ginkgo.AfterEach(func() {
		for _, tr := range testRegressions {
			if tr.Regression != nil {
				dbc.DB.Delete(tr.Regression)
			}
		}
		if cache != nil {
			cache.Close()
		}
	})

	ginkgo.It("find potential matching regressions", func() {
		defer cleanupAllTriages(dbc)

		triage := models.Triage{
			URL:  "https://issues.redhat.com/OCPBUGS-1234",
			Type: models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				{ID: testRegressions[0].Regression.ID},
				{ID: testRegressions[1].Regression.ID},
			},
		}

		var triageResponse models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triage, &triageResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(triageResponse.Regressions).To(gomega.HaveLen(2))

		var potentialMatches []componentreadiness.PotentialMatchingRegression
		endpoint := fmt.Sprintf("/api/component_readiness/triages/%d/matches?baseRelease=%s&sampleRelease=%s", triageResponse.ID, view.BaseRelease.Release.Name, view.SampleRelease.Release.Name)
		err = util.SippyGet(endpoint, &potentialMatches)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(potentialMatches).NotTo(gomega.BeEmpty())

		baseURL := fmt.Sprintf("http://%s:%s", os.Getenv("SIPPY_ENDPOINT"), os.Getenv("SIPPY_API_PORT"))
		for _, match := range potentialMatches {
			gomega.Expect(match.Links["self"]).To(gomega.Equal(
				fmt.Sprintf("%s/api/component_readiness/triages/%d/matches", baseURL, triageResponse.ID)))
			gomega.Expect(match.Links["triage"]).To(gomega.Equal(
				fmt.Sprintf("%s/api/component_readiness/triages/%d", baseURL, triageResponse.ID)))
		}

		foundRegressionIDs := make(map[uint]bool)
		confidenceLevels := make(map[uint]int)
		matchesBySimilarName := make(map[uint][]componentreadiness.SimilarlyNamedTest)
		matchesBySameFailure := make(map[uint][]models.TestRegression)
		statusMap := make(map[uint]crtest.Status)

		for _, match := range potentialMatches {
			if match.RegressedTest.Regression == nil {
				continue
			}
			regressionID := match.RegressedTest.Regression.ID
			foundRegressionIDs[regressionID] = true
			confidenceLevels[regressionID] = match.ConfidenceLevel
			statusMap[regressionID] = match.RegressedTest.TestComparison.ReportStatus
			if len(match.SimilarlyNamedTests) > 0 {
				matchesBySimilarName[regressionID] = match.SimilarlyNamedTests
			}
			if len(match.SameLastFailures) > 0 {
				matchesBySameFailure[regressionID] = match.SameLastFailures
			}
		}

		gomega.Expect(foundRegressionIDs).NotTo(gomega.HaveKey(testRegressions[0].Regression.ID))
		gomega.Expect(foundRegressionIDs).NotTo(gomega.HaveKey(testRegressions[1].Regression.ID))
		gomega.Expect(foundRegressionIDs).To(gomega.HaveKey(testRegressions[2].Regression.ID))
		gomega.Expect(foundRegressionIDs).To(gomega.HaveKey(testRegressions[3].Regression.ID))
		gomega.Expect(foundRegressionIDs).To(gomega.HaveKey(testRegressions[4].Regression.ID))
		gomega.Expect(foundRegressionIDs).To(gomega.HaveKey(testRegressions[5].Regression.ID))
		gomega.Expect(foundRegressionIDs).To(gomega.HaveKey(testRegressions[8].Regression.ID))
		gomega.Expect(foundRegressionIDs).To(gomega.HaveKey(testRegressions[9].Regression.ID))
		gomega.Expect(foundRegressionIDs).NotTo(gomega.HaveKey(testRegressions[6].Regression.ID))
		gomega.Expect(foundRegressionIDs).NotTo(gomega.HaveKey(testRegressions[7].Regression.ID))

		gomega.Expect(statusMap[testRegressions[2].Regression.ID]).To(gomega.Equal(crtest.ExtremeTriagedRegression))
		gomega.Expect(statusMap[testRegressions[3].Regression.ID]).To(gomega.Equal(crtest.SignificantTriagedRegression))
		gomega.Expect(statusMap[testRegressions[4].Regression.ID]).To(gomega.Equal(crtest.FixedRegression))
		gomega.Expect(statusMap[testRegressions[5].Regression.ID]).To(gomega.Equal(crtest.MissingSample))
		gomega.Expect(statusMap[testRegressions[8].Regression.ID]).To(gomega.Equal(crtest.MissingBasisAndSample))
		gomega.Expect(statusMap[testRegressions[9].Regression.ID]).To(gomega.Equal(crtest.SignificantImprovement))

		gomega.Expect(matchesBySimilarName).To(gomega.HaveKey(testRegressions[2].Regression.ID))
		gomega.Expect(matchesBySimilarName[testRegressions[2].Regression.ID]).To(gomega.HaveLen(1))
		gomega.Expect(confidenceLevels[testRegressions[2].Regression.ID]).To(gomega.Equal(4))

		gomega.Expect(matchesBySameFailure).To(gomega.HaveKey(testRegressions[3].Regression.ID))
		gomega.Expect(matchesBySameFailure[testRegressions[3].Regression.ID]).To(gomega.HaveLen(1))
		gomega.Expect(confidenceLevels[testRegressions[3].Regression.ID]).To(gomega.Equal(1))

		gomega.Expect(matchesBySimilarName).To(gomega.HaveKey(testRegressions[4].Regression.ID))
		gomega.Expect(matchesBySameFailure).To(gomega.HaveKey(testRegressions[4].Regression.ID))
		gomega.Expect(confidenceLevels[testRegressions[4].Regression.ID]).To(gomega.Equal(6))

		gomega.Expect(matchesBySimilarName).To(gomega.HaveKey(testRegressions[5].Regression.ID))
		gomega.Expect(confidenceLevels[testRegressions[5].Regression.ID]).To(gomega.Equal(5))
		gomega.Expect(matchesBySameFailure).NotTo(gomega.HaveKey(testRegressions[5].Regression.ID))

		gomega.Expect(matchesBySameFailure).To(gomega.HaveKey(testRegressions[8].Regression.ID))
		gomega.Expect(confidenceLevels[testRegressions[8].Regression.ID]).To(gomega.Equal(1))
		gomega.Expect(matchesBySimilarName).NotTo(gomega.HaveKey(testRegressions[8].Regression.ID))

		gomega.Expect(matchesBySimilarName).To(gomega.HaveKey(testRegressions[9].Regression.ID))
		gomega.Expect(confidenceLevels[testRegressions[9].Regression.ID]).To(gomega.Equal(5))
	})

	ginkgo.It("empty potential matches when no regressions exist", func() {
		defer cleanupAllTriages(dbc)

		triage := models.Triage{
			URL:  "https://issues.redhat.com/OCPBUGS-1234",
			Type: models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				{ID: testRegressions[6].Regression.ID},
			},
		}

		var triageResponse models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triage, &triageResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		var potentialMatches []componentreadiness.PotentialMatchingRegression
		endpoint := fmt.Sprintf("/api/component_readiness/triages/%d/matches?baseRelease=%s&sampleRelease=%s", triageResponse.ID, view.BaseRelease.Release.Name, view.SampleRelease.Release.Name)
		err = util.SippyGet(endpoint, &potentialMatches)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		foundRegressionIDs := make(map[uint]bool)
		for _, match := range potentialMatches {
			if match.RegressedTest.Regression != nil {
				foundRegressionIDs[match.RegressedTest.Regression.ID] = true
			}
		}
		gomega.Expect(foundRegressionIDs).NotTo(gomega.HaveKey(testRegressions[6].Regression.ID))
	})

	ginkgo.It("empty potential matches when release pair does not match any view", func() {
		defer cleanupAllTriages(dbc)

		triage := models.Triage{
			URL:  "https://issues.redhat.com/OCPBUGS-9999",
			Type: models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				{ID: testRegressions[0].Regression.ID},
			},
		}

		var triageResponse models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triage, &triageResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		var potentialMatches []componentreadiness.PotentialMatchingRegression
		endpoint := fmt.Sprintf("/api/component_readiness/triages/%d/matches?baseRelease=no-such-base&sampleRelease=no-such-sample", triageResponse.ID)
		err = util.SippyGet(endpoint, &potentialMatches)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(potentialMatches).To(gomega.BeEmpty())
	})

	ginkgo.It("error when triage not found", func() {
		var potentialMatches []interface{}
		err := util.SippyGet("/api/component_readiness/triages/999999/matches", &potentialMatches)
		gomega.Expect(err).To(gomega.HaveOccurred())
	})

	ginkgo.It("verify status values in triage responses", func() {
		defer cleanupAllTriages(dbc)

		triage := models.Triage{
			URL:  "https://issues.redhat.com/OCPBUGS-5678",
			Type: models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				{ID: testRegressions[0].Regression.ID},
				{ID: testRegressions[1].Regression.ID},
				{ID: testRegressions[4].Regression.ID},
			},
		}

		var triageResponse models.Triage
		err := util.SippyPost("/api/component_readiness/triages", &triage, &triageResponse)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(triageResponse.Regressions).To(gomega.HaveLen(3))

		regressionIDs := make(map[uint]bool)
		for _, regression := range triageResponse.Regressions {
			regressionIDs[regression.ID] = true
		}
		gomega.Expect(regressionIDs).To(gomega.HaveKey(testRegressions[0].Regression.ID))
		gomega.Expect(regressionIDs).To(gomega.HaveKey(testRegressions[1].Regression.ID))
		gomega.Expect(regressionIDs).To(gomega.HaveKey(testRegressions[4].Regression.ID))
	})
})

func createAndValidateTriageRecord(bugURL string, testRegression1 *models.TestRegression) models.Triage {
	triage1 := models.Triage{
		URL:  bugURL,
		Type: models.TriageTypeProduct,
		Regressions: []models.TestRegression{
			{ID: testRegression1.ID},
		},
	}

	var triageResponse models.Triage
	err := util.SippyPost("/api/component_readiness/triages", &triage1, &triageResponse)
	gomega.Expect(err).NotTo(gomega.HaveOccurred())
	gomega.Expect(triageResponse.ID).To(gomega.BeNumerically(">", 0))
	gomega.Expect(triageResponse.Regressions).To(gomega.HaveLen(1))

	var lookupTriage models.Triage
	err = util.SippyGet(fmt.Sprintf("/api/component_readiness/triages/%d", triageResponse.ID), &lookupTriage)
	gomega.Expect(err).NotTo(gomega.HaveOccurred())
	gomega.Expect(lookupTriage.Type).To(gomega.Equal(models.TriageTypeProduct))
	return lookupTriage
}

func createBug(dbc *gorm.DB) *models.Bug {
	jiraBug := models.Bug{
		Key:        "MYBUGS-100",
		Status:     "New",
		Summary:    "foo bar",
		Components: pq.StringArray{"component1", "component2"},
		Labels:     pq.StringArray{"label1", "label2"},
		URL:        "https://issues.redhat.com/browse/MYBUGS-100",
	}
	res := dbc.Create(&jiraBug)
	gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
	return &jiraBug
}

func createTestRegression(tracker componentreadiness.RegressionStore, view crview.View, testID string) *models.TestRegression {
	newRegression := componentreport.ReportTestSummary{
		TestComparison: testdetails.TestComparison{
			BaseStats: &testdetails.ReleaseStats{
				Release: util.BaseRelease,
			},
		},
		Identification: crtest.Identification{
			RowIdentification: crtest.RowIdentification{
				Component:  "comp",
				Capability: "cap",
				TestName:   "fake test",
				TestSuite:  "fakesuite",
				TestID:     testID,
			},
			ColumnIdentification: crtest.ColumnIdentification{
				Variants: map[string]string{
					"a": "b",
					"c": "d",
				},
			},
		},
	}
	testRegression, err := tracker.OpenRegression(view, newRegression)
	gomega.Expect(err).NotTo(gomega.HaveOccurred())
	return testRegression
}

func deepCopyTriage(original models.Triage) models.Triage {
	data, err := json.Marshal(original)
	gomega.Expect(err).NotTo(gomega.HaveOccurred())

	var triageCopy models.Triage
	err = json.Unmarshal(data, &triageCopy)
	gomega.Expect(err).NotTo(gomega.HaveOccurred())
	return triageCopy
}

func assertTriageDataMatches(expectedTriage, actualTriage models.Triage, field string) {
	gomega.Expect(actualTriage.ID).To(gomega.Equal(expectedTriage.ID), "%s ID should match", field)
	gomega.Expect(actualTriage.URL).To(gomega.Equal(expectedTriage.URL), "%s URL should match", field)
	gomega.Expect(actualTriage.Regressions).To(gomega.HaveLen(len(expectedTriage.Regressions)), "%s regressions count should match", field)

	if len(actualTriage.Regressions) > 0 && len(expectedTriage.Regressions) > 0 {
		gomega.Expect(actualTriage.Regressions[0].ID).To(gomega.Equal(expectedTriage.Regressions[0].ID), "%s regression ID should match", field)
	}
}

func createTestRegressionWithDetails(tracker componentreadiness.RegressionStore, view crview.View, testID, component, capability, testName string, lastFailure *time.Time, status crtest.Status) componentreport.ReportTestSummary {
	newRegression := componentreport.ReportTestSummary{
		TestComparison: testdetails.TestComparison{
			ReportStatus: status,
			BaseStats: &testdetails.ReleaseStats{
				Release: util.BaseRelease,
			},
			LastFailure: lastFailure,
		},
		Identification: crtest.Identification{
			RowIdentification: crtest.RowIdentification{
				Component:  component,
				Capability: capability,
				TestName:   testName,
				TestSuite:  "fakesuite",
				TestID:     testID,
			},
			ColumnIdentification: crtest.ColumnIdentification{
				Variants: map[string]string{
					"a": "b",
					"c": "d",
				},
			},
		},
	}
	regression, err := tracker.OpenRegression(view, newRegression)
	gomega.Expect(err).NotTo(gomega.HaveOccurred())
	newRegression.Regression = regression
	return newRegression
}
