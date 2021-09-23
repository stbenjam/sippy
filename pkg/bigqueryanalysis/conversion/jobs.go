package conversion

import (
	bigqueryv1 "github.com/openshift/sippy/pkg/apis/bigquery/v1"
	sippyv1 "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
	"github.com/openshift/sippy/pkg/util"
)

func JobMerge(bigqueryJobs []bigqueryv1.Job, sippyJobs []sippyv1.JobResult) []sippyv1.JobResult {
	for _, bqj := range bigqueryJobs {
		result := util.FindJobResultForJobName(bqj.JobName, sippyJobs)
		if result == nil {
			continue
		}

		result.GCSBucketName = bqj.GCSBucketName
		result.GCSJobHistoryLocationPrefix = bqj.GCSJobHistoryLocationPrefix
		result.IPMode = bqj.IPMode
		result.Network = bqj.Network
		result.RunsE2EParallel = bqj.RunsE2EParallel
		result.RunsE2ESerial = bqj.RunsE2ESerial
		result.RunsUpgrade = bqj.RunsUpgrade
		result.Topology = bqj.Topology
	}

	return sippyJobs
}
