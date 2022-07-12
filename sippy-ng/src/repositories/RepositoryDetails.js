import { Card, Container, Grid, Tooltip, Typography } from '@material-ui/core'
import { createTheme, makeStyles } from '@material-ui/core/styles'
import {
  filterFor,
  multiple,
  pathForJobsWithFilter,
  withoutUnstable,
  withSort,
} from '../helpers'
import { Link } from 'react-router-dom'
import InfoIcon from '@material-ui/icons/Info'
import JobTable from '../jobs/JobTable'
import PropTypes from 'prop-types'
import React, { Fragment, useEffect } from 'react'
import SimpleBreadcrumbs from '../components/SimpleBreadcrumbs'

const defaultTheme = createTheme()
const useStyles = makeStyles(
  (theme) => ({
    root: {
      flexGrow: 1,
    },
    card: {
      minWidth: 275,
      alignContent: 'center',
      margin: 'auto',
    },
    title: {
      textAlign: 'center',
    },
    warning: {
      margin: 10,
      width: '100%',
    },
  }),
  { defaultTheme }
)

export default function RepositoryDetails(props) {
  const classes = useStyles()

  return (
    <Fragment>
      <SimpleBreadcrumbs release={props.release} />
      <div className="{classes.root}" style={{ padding: 20 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" gutterBottom className={classes.title}>
            {props.org}/{props.repo}
          </Typography>
        </Container>

        <Grid item md={12} sm={12}>
          <Card elevation={5} style={{ padding: 20, height: '100%' }}>
            <Typography variant="h6">
              <Link
                to={withSort(
                  pathForJobsWithFilter(props.release, {
                    items: [
                      filterFor('average_runs_to_merge', '>', '1'),
                      filterFor('org', 'equals', props.org),
                      filterFor('repo', 'equals', props.repo),
                    ],
                  }),
                  'average_runs_to_merge',
                  'desc'
                )}
              >
                Unreliable jobs
              </Link>
              <Tooltip
                title={
                  'This table shows the list of jobs configured for this repository, that take on average more than 1 run for a ' +
                  'PR to merge. This only includes the job runs from the merged SHA, that is to say retests by developer pushes ' +
                  'are not included in this statistic.'
                }
              >
                <InfoIcon />
              </Tooltip>
            </Typography>
            <JobTable
              view="Pull Requests"
              sortField="average_runs_to_merge"
              sort="desc"
              pageSize={5}
              hideControls={true}
              release={props.release}
              filterModel={{
                items: [
                  filterFor('average_runs_to_merge', '>', '1'),
                  filterFor('org', 'equals', props.org),
                  filterFor('repo', 'equals', props.repo),
                ],
              }}
            />
          </Card>
        </Grid>
      </div>
    </Fragment>
  )
}

RepositoryDetails.propTypes = {
  org: PropTypes.string.isRequired,
  repo: PropTypes.string.isRequired,
  release: PropTypes.string.isRequired,
}
