package db

import (
	"context"

	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"github.com/openshift/sippy/pkg/db/models"
	"github.com/openshift/sippy/pkg/prowloader/github"
)

func syncPRStatus(dbc *gorm.DB) {
	pulls := make([]models.ProwPullRequest, 0)
	dbc.Table("prow_pull_requests").Scan(&pulls)
	githubClient := github.New(context.TODO())
	for _, pr := range pulls {
		if pr.Merged != nil {
			continue
		}

		merged, err := githubClient.GetPRMerged(pr.Org, pr.Repo, pr.Number, pr.SHA)
		if err != nil {
			log.WithError(err).Warningf("could not fetch pull request status from GitHub; org=%q repo=%q number=%q sha=%q", pr.Org, pr.Repo, pr.Number, pr.SHA)
		}
		pr.Merged = merged
		if res := dbc.Save(pr); res.Error != nil {
			log.WithError(res.Error).Errorf("unexpected error updating pull request %s (%s)", pr.Link, pr.SHA)
		}
	}
}
