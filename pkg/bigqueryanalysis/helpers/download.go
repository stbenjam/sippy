package helpers

import (
	"context"
	"encoding/gob"
	"os"
	"path"

	v1 "github.com/openshift/sippy/pkg/apis/bigquery/v1"
	"github.com/openshift/sippy/pkg/bigqueryanalysis"
)

func DownloadData(dashboards []string, storagePath string) {
	ctx := context.Background()
	client, err := bigqueryanalysis.New(ctx)
	if err != nil {
		panic(err)
	}

	jobs, err := client.GetJobs(ctx, dashboards)
	if err != nil {
		panic(err)
	}

	file, err := os.Create(path.Join(storagePath, "big-query-jobs.bin"))
	if err != nil {
		panic(err)
	}
	defer file.Close()

	encoder := gob.NewEncoder(file)
	if err := encoder.Encode(jobs); err != nil {
		panic(err)
	}
}

func LoadFromDisk(storagePath string) (jobs []v1.Job, err error) {
	file, err := os.Open(path.Join(storagePath, "big-query-jobs.bin"))
	if err != nil {
		return nil, err
	}
	defer file.Close()
	decoder := gob.NewDecoder(file)
	if err := decoder.Decode(&jobs); err != nil {
		return nil, err
	}

	return
}
