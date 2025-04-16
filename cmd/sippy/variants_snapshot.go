package main

import (
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/openshift/sippy/pkg/variantregistry"
)

type VariantSnapshotFlags struct {
	Path string
}

func NewVariantSnapshotFlags() *VariantSnapshotFlags {
	return &VariantSnapshotFlags{
		Path: "pkg/variantregistry/snapshot.yaml",
	}
}

func (f *VariantSnapshotFlags) BindFlags(fs *pflag.FlagSet) {
	fs.StringVar(&f.Path, "out", f.Path, "Path to write results to")
}

func NewVariantSnapshotCommand() *cobra.Command {
	f := NewVariantSnapshotFlags()

	cmd := &cobra.Command{
		Use:   "snapshot",
		Short: "Update the variants snapshot with local data",
		RunE: func(cmd *cobra.Command, args []string) error {
			lgr := log.New()
			snapshot := variantregistry.NewVariantSnapshot(lgr)
			if err := snapshot.Save(f.Path); err != nil {
				lgr.WithError(err).Fatal("error updating snapshot")
			}

			lgr.Infof("variants successfully snapshotted")
			return nil
		},
	}

	f.BindFlags(cmd.Flags())

	return cmd
}
