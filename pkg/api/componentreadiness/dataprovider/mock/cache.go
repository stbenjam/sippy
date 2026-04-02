package mock

import (
	"context"
	"fmt"
	"time"

	"github.com/openshift/sippy/pkg/apis/cache"
)

var _ cache.Cache = &NoOpCache{}

// NoOpCache is a cache implementation that never stores or returns data.
// Used with the mock provider so no Redis is required.
type NoOpCache struct{}

func (n *NoOpCache) Get(_ context.Context, _ string, _ time.Duration) ([]byte, error) {
	return nil, fmt.Errorf("cache miss")
}

func (n *NoOpCache) Set(_ context.Context, _ string, _ []byte, _ time.Duration) error {
	return nil
}
