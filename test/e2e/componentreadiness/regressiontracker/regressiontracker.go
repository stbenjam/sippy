package regressiontracker

import (
	"context"
	"database/sql"
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
	"github.com/openshift/sippy/test/e2e/util"
	log "github.com/sirupsen/logrus"
)

func cleanupAllRegressions(dbc *db.DB) {
	res := dbc.DB.Where("1 = 1").Delete(&models.TestRegression{})
	if res.Error != nil {
		log.Errorf("error deleting test regressions: %v", res.Error)
	}
}

var _ = ginkgo.Describe("Regression Tracker", func() {
	var dbc *db.DB
	var tracker componentreadiness.RegressionStore

	newRegression := componentreport.ReportTestSummary{
		TestComparison: testdetails.TestComparison{
			BaseStats: &testdetails.ReleaseStats{
				Release: "4.18",
			},
		},
		Identification: crtest.Identification{
			RowIdentification: crtest.RowIdentification{
				Component:  "comp",
				Capability: "cap",
				TestName:   "fake test",
				TestSuite:  "fakesuite",
				TestID:     "faketestid",
			},
			ColumnIdentification: crtest.ColumnIdentification{
				Variants: map[string]string{
					"a": "b",
					"c": "d",
				},
			},
		},
	}
	view := crview.View{
		Name: "4.19-main",
		SampleRelease: reqopts.RelativeRelease{
			Release: reqopts.Release{
				Name: "4.19",
			},
		},
	}

	ginkgo.BeforeEach(func() {
		dbc = util.MustCreateE2EPostgresConnection()
		tracker = componentreadiness.NewPostgresRegressionStore(dbc, nil)
	})

	ginkgo.It("should open a new regression", func() {
		defer cleanupAllRegressions(dbc)
		tr, err := tracker.OpenRegression(view, newRegression)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(tr.Release).To(gomega.Equal("4.19"))
		gomega.Expect(tr.BaseRelease).To(gomega.Equal("4.18"), "BaseRelease should be set from BaseStats.Release")
		gomega.Expect(tr.Variants).To(gomega.ConsistOf(pq.StringArray([]string{"a:b", "c:d"})))
		gomega.Expect(tr.ID).To(gomega.BeNumerically(">", 0))
	})

	ginkgo.It("should close and reopen a regression", func() {
		defer cleanupAllRegressions(dbc)
		tr, err := tracker.OpenRegression(view, newRegression)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		lookup := &models.TestRegression{ID: tr.ID}
		dbc.DB.First(&lookup)
		gomega.Expect(lookup.ID).To(gomega.Equal(tr.ID))
		gomega.Expect(lookup.TestName).To(gomega.Equal(tr.TestName))

		// Close it
		gomega.Expect(lookup.Closed.Valid).To(gomega.BeFalse())
		lookup.Closed = sql.NullTime{Valid: true, Time: time.Now()}
		err = tracker.UpdateRegression(lookup)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		dbc.DB.First(&lookup)
		gomega.Expect(lookup.Closed.Valid).To(gomega.BeTrue())

		// Reopen it
		lookup.Closed = sql.NullTime{Valid: false}
		err = tracker.UpdateRegression(lookup)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		dbc.DB.First(&lookup)
		gomega.Expect(lookup.Closed.Valid).To(gomega.BeFalse())
	})

	ginkgo.It("should list current regressions for release", func() {
		defer cleanupAllRegressions(dbc)
		var err error
		open419, err := rawCreateRegression(dbc, "4.19",
			"test1ID", "test 1",
			[]string{"a:b", "c:d"},
			time.Now().Add(-77*24*time.Hour), time.Time{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		recentlyClosed419, err := rawCreateRegression(dbc, "4.19",
			"test2ID", "test 2",
			[]string{"a:b", "c:d"},
			time.Now().Add(-77*24*time.Hour), time.Now().Add(-2*24*time.Hour))
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		_, err = rawCreateRegression(dbc, "4.19",
			"test3ID", "test 3",
			[]string{"a:b", "c:d"},
			time.Now().Add(-77*24*time.Hour), time.Now().Add(-70*24*time.Hour))
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		_, err = rawCreateRegression(dbc, "4.18",
			"test1ID", "test 1",
			[]string{"a:b", "c:d"},
			time.Now().Add(-77*24*time.Hour), time.Time{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		relRegressions, err := tracker.ListCurrentRegressionsForRelease("4.19")
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(relRegressions).To(gomega.HaveLen(2))
		for _, rel := range relRegressions {
			gomega.Expect(rel.ID == open419.ID || rel.ID == recentlyClosed419.ID).To(gomega.BeTrue(),
				"unexpected regression was returned: %+v", *rel)
		}
	})

	ginkgo.It("should list regressions with BaseRelease set", func() {
		defer cleanupAllRegressions(dbc)
		tr, err := rawCreateRegressionWithBase(dbc, "4.19", "4.18", "baseTestID", "base test",
			[]string{"a:b"}, time.Now().Add(-1*24*time.Hour), time.Time{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		relRegressions, err := tracker.ListCurrentRegressionsForRelease("4.19")
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(relRegressions).To(gomega.HaveLen(1))
		gomega.Expect(relRegressions[0].ID).To(gomega.Equal(tr.ID))
		gomega.Expect(relRegressions[0].BaseRelease).To(gomega.Equal("4.18"), "ListCurrentRegressionsForRelease should return BaseRelease")
	})

	ginkgo.It("closing a regression should resolve associated triages that have no other active regressions", func() {
		defer cleanupAllRegressions(dbc)

		regressionToClose, err := tracker.OpenRegression(view, newRegression)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		secondRegression := componentreport.ReportTestSummary{
			TestComparison: testdetails.TestComparison{
				BaseStats: &testdetails.ReleaseStats{
					Release: "4.18",
				},
			},
			Identification: crtest.Identification{
				RowIdentification: crtest.RowIdentification{
					Component:  "comp2",
					Capability: "cap2",
					TestName:   "second test",
					TestSuite:  "fakesuite",
					TestID:     "secondtestid",
				},
				ColumnIdentification: crtest.ColumnIdentification{
					Variants: map[string]string{
						"a": "b",
						"c": "d",
					},
				},
			},
		}
		_, err = tracker.OpenRegression(view, secondRegression)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		// Create first triage associated only with the first regression
		triage := models.Triage{
			URL:         "https://issues.redhat.com/browse/TEST-123",
			Description: "Test triage for auto-resolution",
			Type:        models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				*regressionToClose,
			},
		}
		dbWithContext := dbc.DB.WithContext(context.WithValue(context.Background(), models.CurrentUserKey, "e2e-test"))
		res := dbWithContext.Create(&triage)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())

		// Create second triage associated with both regressions
		triage2 := models.Triage{
			URL:         "https://issues.redhat.com/browse/TEST-456",
			Description: "Test triage with multiple regressions",
			Type:        models.TriageTypeProduct,
			Regressions: []models.TestRegression{
				*regressionToClose,
			},
		}
		res = dbWithContext.Create(&triage2)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())

		// Close the regression with a time of NOW, should not result in resolved triage
		regressionToClose.Closed = sql.NullTime{Valid: true, Time: time.Now()}
		err = tracker.UpdateRegression(regressionToClose)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		var checkRegression models.TestRegression
		_ = dbc.DB.First(&checkRegression, regressionToClose.ID)
		gomega.Expect(checkRegression.Closed.Valid).To(gomega.BeTrue(), "Regression should be closed")

		err = tracker.ResolveTriages()
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		checkTriage := models.Triage{}
		res = dbc.DB.First(&checkTriage, triage.ID)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		gomega.Expect(checkTriage.Resolved.Valid).To(gomega.BeFalse(), "Triage should NOT be automatically resolved when its regression has been closed less than 5 days ago")

		// Close the regression with a time > 5 days in the past
		sixDaysAgo := time.Now().Add(-6 * 24 * time.Hour)
		regressionToClose.Closed = sql.NullTime{Valid: true, Time: sixDaysAgo}
		err = tracker.UpdateRegression(regressionToClose)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		_ = dbc.DB.First(&checkRegression, regressionToClose.ID)
		gomega.Expect(checkRegression.Closed.Valid).To(gomega.BeTrue())
		gomega.Expect(checkRegression.Closed.Time).To(gomega.BeTemporally("~", sixDaysAgo, time.Second))

		err = tracker.ResolveTriages()
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		res = dbc.DB.First(&checkTriage, triage.ID)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		gomega.Expect(checkTriage.Resolved.Valid).To(gomega.BeTrue(), "Triage should be automatically resolved when its only regression is closed")
		gomega.Expect(checkTriage.Resolved.Time).To(gomega.BeTemporally("~", checkRegression.Closed.Time, time.Second))

		// Verify triage2 is NOT resolved because it still has an open regression
		checkTriage2 := models.Triage{}
		res = dbc.DB.First(&checkTriage2, triage2.ID)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		gomega.Expect(checkTriage2.Resolved.Valid).To(gomega.BeFalse(), "Triage2 should not be resolved because it still has an open regression")

		// Verify audit log entry
		var auditLog models.AuditLog
		res = dbc.DB.Where("table_name = ?", "triage").
			Where("row_id = ?", triage.ID).
			Where("operation = ?", models.Update).
			Order("created_at DESC").
			First(&auditLog)
		gomega.Expect(res.Error).NotTo(gomega.HaveOccurred())
		gomega.Expect(auditLog.User).To(gomega.Equal("regression-tracker"), "Audit log should show regression-tracker as the user for auto-resolution")
	})
})

func rawCreateRegression(
	dbc *db.DB,
	release string,
	testID string,
	testName string,
	variants []string,
	opened, closed time.Time) (*models.TestRegression, error) {
	return rawCreateRegressionWithBase(dbc, release, "", testID, testName, variants, opened, closed)
}

func rawCreateRegressionWithBase(
	dbc *db.DB,
	release, baseRelease string,
	testID string,
	testName string,
	variants []string,
	opened, closed time.Time) (*models.TestRegression, error) {
	newRegression := &models.TestRegression{
		Release:     release,
		BaseRelease: baseRelease,
		TestID:      testID,
		TestName:    testName,
		Opened:      opened,
		Variants:    variants,
	}
	if closed.IsZero() {
		newRegression.Closed = sql.NullTime{Valid: false}
	} else {
		newRegression.Closed = sql.NullTime{Valid: true, Time: closed}
	}
	res := dbc.DB.Create(newRegression)
	return newRegression, res.Error
}
