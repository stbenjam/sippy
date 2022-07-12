package github

import (
	"context"
	"time"

	"github.com/google/go-github/v45/github"
	"github.com/tcnksm/go-gitconfig"
	"golang.org/x/oauth2"
)

type prlocator struct {
	org    string
	repo   string
	number int
	sha    string
}

type Client struct {
	ctx    context.Context
	client *github.Client
	cache  map[prlocator]*time.Time
}

func New(ctx context.Context) *Client {
	client := &Client{
		ctx:   ctx,
		cache: make(map[prlocator]*time.Time),
	}
	token, err := gitconfig.GithubToken()

	if token != "" && err == nil {
		ts := oauth2.StaticTokenSource(
			&oauth2.Token{
				AccessToken: token,
			},
		)
		tc := oauth2.NewClient(client.ctx, ts)
		client.client = github.NewClient(tc)
	} else {
		client.client = github.NewClient(nil)
	}

	return client
}

func (c *Client) GetPRMerged(org, repo string, number int, sha string) (*time.Time, error) {
	zero := time.Time{}
	prl := prlocator{org: org, repo: repo, number: number, sha: sha}
	if val, ok := c.cache[prl]; ok {
		if *val == zero {
			return nil, nil
		}
		return val, nil
	}

	pr, _, err := c.client.PullRequests.Get(c.ctx, org, repo, number)
	if err != nil {
		return nil, err
	}

	// see if PR was merged yet
	state := pr.MergedAt
	if state == nil {
		c.cache[prl] = &time.Time{}
		return nil, nil
	}

	val := &zero
	// if it is merged, see if it was this sha
	if pr.Head != nil && pr.Head.SHA != nil && *pr.Head.SHA == sha {
		val = pr.MergedAt
	}

	c.cache[prl] = val
	return val, nil
}
