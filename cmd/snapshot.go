package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/openshift/sippy/cmd/flags"
	"github.com/openshift/sippy/pkg/snapshot"
)

type SnapshotFlags struct {
	DBFlags  *flags.PostgresDatabaseFlags
	SippyURL string
	Name     string
	Release  string
}

func NewSnapshotFlags() *SnapshotFlags {
	return &SnapshotFlags{
		DBFlags:  flags.NewPostgresDatabaseFlags(),
		SippyURL: "https://sippy.dptools.openshift.org",
	}
}

func (f *SnapshotFlags) BindFlags(fs *pflag.FlagSet) {
	f.DBFlags.BindFlags(fs)
	fs.StringVar(&f.SippyURL, "sippy-url", f.SippyURL, "Sippy endpoint to hit when creating a snapshot")
	fs.StringVar(&f.Name, "name", f.Name, "Snapshot name")
	fs.StringVar(&f.Release, "release", f.Release, "Snapshot release (i.e. 4.12)")
}

func init() {
	f := NewSnapshotFlags()

	cmd := &cobra.Command{
		Use:   "snapshot",
		Short: "Create snapshots using current sippy overview API json and store in the database",
		Run: func(cmd *cobra.Command, args []string) {
			dbc := f.DBFlags.GetDBClient()

			snapshotter := &snapshot.Snapshotter{
				DBC:      dbc,
				SippyURL: f.SippyURL,
				Name:     f.Name,
				Release:  f.Release,
			}

			if err := snapshotter.Create(); err != nil {
				fmt.Printf("could not create snapshot: %+v", err)
				os.Exit(1)
			}
		},
	}

	f.BindFlags(cmd.Flags())
	cmd.MarkFlagRequired("name")    //nolint:errcheck
	cmd.MarkFlagRequired("release") //nolint:errcheck
	rootCmd.AddCommand(cmd)
}
