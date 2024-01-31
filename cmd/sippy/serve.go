package main

import (
	"context"
	"fmt"
	"io/fs"
	"net/http"
	"time"

	"github.com/pkg/errors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	resources "github.com/openshift/sippy"
	"github.com/openshift/sippy/pkg/apis/cache"
	"github.com/openshift/sippy/pkg/dataloader/prowloader/gcs"
	"github.com/openshift/sippy/pkg/db/models"
	"github.com/openshift/sippy/pkg/flags"
	"github.com/openshift/sippy/pkg/sippyserver"
	"github.com/openshift/sippy/pkg/sippyserver/metrics"
	"github.com/openshift/sippy/pkg/util"
)

var (
	defaultCRTimeRoundingFactor = 4 * time.Hour
	maxCRTimeRoundingFactor     = 12 * time.Hour
)

type ServerFlags struct {
	DBFlags          *flags.PostgresFlags
	ModeFlags        *flags.ModeFlags
	BigQueryFlags    *flags.BigQueryFlags
	CacheFlags       *flags.CacheFlags
	GoogleCloudFlags *flags.GoogleCloudFlags

	ListenAddr           string
	MetricsAddr          string
	CRTimeRoundingFactor time.Duration
}

func NewServerFlags() *ServerFlags {
	return &ServerFlags{
		DBFlags:          flags.NewPostgresDatabaseFlags(),
		ModeFlags:        flags.NewModeFlags(),
		BigQueryFlags:    flags.NewBigQueryFlags(),
		CacheFlags:       flags.NewCacheFlags(),
		GoogleCloudFlags: flags.NewGoogleCloudFlags(),
		ListenAddr:       ":8080",
		MetricsAddr:      ":2112",
	}
}

func (f *ServerFlags) BindFlags(flagSet *pflag.FlagSet) {
	f.DBFlags.BindFlags(flagSet)
	f.ModeFlags.BindFlags(flagSet)
	f.BigQueryFlags.BindFlags(flagSet)
	f.CacheFlags.BindFlags(flagSet)
	f.GoogleCloudFlags.BindFlags(flagSet)

	flagSet.StringVar(&f.ListenAddr, "listen", f.ListenAddr, "The address to serve analysis reports on (default :8080)")
	flagSet.StringVar(&f.MetricsAddr, "listen-metrics", f.MetricsAddr, "The address to serve prometheus metrics on (default :2112)")
	factorUsage := fmt.Sprintf("Set the rounding factor for component readiness release time. The time will be rounded down to the nearest multiple of the factor. Maximum value is %v", maxCRTimeRoundingFactor)
	flagSet.DurationVar(&f.CRTimeRoundingFactor, "component-readiness-time-rounding-factor", defaultCRTimeRoundingFactor, factorUsage)

}

func NewServeCommand() *cobra.Command {
	f := NewServerFlags()

	cmd := &cobra.Command{
		Use:   "serve",
		Short: "Run the sippy server",
		RunE: func(cmd *cobra.Command, args []string) error {
			dbc, err := f.DBFlags.GetDBClient()
			if err != nil {
				return errors.WithMessage(err, "couldn't get DB client")
			}

			cacheClient, err := f.CacheFlags.GetCacheClient()
			if err != nil {
				return errors.WithMessage(err, "couldn't get cache client")
			}

			bigQueryClient, err := f.BigQueryFlags.GetBigQueryClient(context.Background(), cacheClient, f.GoogleCloudFlags.ServiceAccountCredentialFile)
			if err != nil {
				return errors.WithMessage(err, "couldn't get bigquery client")
			}

			gcsClient, err := gcs.NewGCSClient(context.TODO(),
				f.GoogleCloudFlags.ServiceAccountCredentialFile,
				f.GoogleCloudFlags.OAuthClientCredentialFile,
			)
			if err != nil {
				log.WithError(err).Warn("unable to create GCS client, some APIs may not work")
			}

			// Make sure the db is intialized, otherwise let the user know:
			prowJobs := []models.ProwJob{}
			res := dbc.DB.Find(&prowJobs).Limit(1)
			if res.Error != nil {
				return errors.WithMessage(err, "error querying for a ProwJob, database may need to be initialized with --init-database")
			}

			webRoot, err := fs.Sub(resources.SippyNG, "sippy-ng/build")
			if err != nil {
				log.WithError(err).Fatal("could not load frontend")
			}

			pinnedDateTime := time.Time(f.DBFlags.PinnedTime)

			server := sippyserver.NewServer(
				f.ModeFlags.GetServerMode(),
				f.ListenAddr,
				f.ModeFlags.GetSyntheticTestManager(),
				f.ModeFlags.GetVariantManager(),
				webRoot,
				&resources.Static,
				dbc,
				f.GoogleCloudFlags.StorageBucket,
				gcsClient,
				bigQueryClient,
				&pinnedDateTime,
				cacheClient,
				f.CRTimeRoundingFactor,
			)

			if f.MetricsAddr != "" {
				// Do an immediate metrics update
				err = metrics.RefreshMetricsDB(dbc, bigQueryClient, f.GoogleCloudFlags.StorageBucket, f.ModeFlags.GetVariantManager(), util.GetReportEnd(&pinnedDateTime), cache.RequestOptions{CRTimeRoundingFactor: f.CRTimeRoundingFactor})
				if err != nil {
					log.WithError(err).Error("error refreshing metrics")
				}

				// Refresh our metrics every 5 minutes:
				ticker := time.NewTicker(5 * time.Minute)
				quit := make(chan struct{})
				go func() {
					for {
						select {
						case <-ticker.C:
							log.Info("tick")
							err := metrics.RefreshMetricsDB(dbc, bigQueryClient, f.GoogleCloudFlags.StorageBucket, f.ModeFlags.GetVariantManager(), util.GetReportEnd(&pinnedDateTime), cache.RequestOptions{CRTimeRoundingFactor: f.CRTimeRoundingFactor})
							if err != nil {
								log.WithError(err).Error("error refreshing metrics")
							}
						case <-quit:
							ticker.Stop()
							return
						}
					}
				}()

				// Serve our metrics endpoint for prometheus to scrape
				go func() {
					http.Handle("/metrics", promhttp.Handler())
					err := http.ListenAndServe(f.MetricsAddr, nil) //nolint
					if err != nil {
						panic(err)
					}
				}()
			}

			server.Serve()
			return nil
		},
	}

	f.BindFlags(cmd.Flags())
	return cmd
}
