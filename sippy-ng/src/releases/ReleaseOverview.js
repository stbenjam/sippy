import { ArrayParam, NumberParam, useQueryParam } from 'use-query-params'
import { BOOKMARKS } from '../constants'
import { Box, Card, Container, Tooltip, Typography } from '@mui/material'
import { CapabilitiesContext } from '../App'
import { dayFilter, JobStackedChart } from '../jobs/JobStackedChart'
import {
  getReportStartDate,
  pathForJobsWithFilter,
  queryForBookmark,
  safeEncodeURIComponent,
  withoutUnstable,
  withoutVariants,
  withSort,
} from '../helpers'
import { Link } from 'react-router-dom'
import { makeStyles } from '@mui/styles'
import { ReportEndContext } from '../App'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import Histogram from '../components/Histogram'
import InfoIcon from '@mui/icons-material/Info'
import JobTable from '../jobs/JobTable'
import PropTypes from 'prop-types'
import React, { Fragment, useEffect } from 'react'
import ReleasePayloadAcceptance from './ReleasePayloadAcceptance'
import SimpleBreadcrumbs from '../components/SimpleBreadcrumbs'
import TestTable from '../tests/TestTable'
import TopLevelIndicators from './TopLevelIndicators'
import VariantCards from '../jobs/VariantCards'
import VariantSelector from '../components/VariantSelector'

export const REGRESSED_TOOLTIP =
  'Shows the most regressed items this week vs. last week, for those with more than 10 runs, excluding never-stable.'
export const TWODAY_WARNING =
  'Shows the last 2 days compared to the last 7 days, sorted by most regressed, excluding never-stable.'
export const TOP_FAILERS_TOOLTIP =
  'Shows the list of tests ordered by their failure percentage.'

const useStyles = makeStyles((theme) => ({
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
}))

export default function ReleaseOverview(props) {
  const classes = useStyles()

  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [data, setData] = React.useState({})
  const [dayOffset = 1, setDayOffset] = useQueryParam('dayOffset', NumberParam)
  const startDate = getReportStartDate(React.useContext(ReportEndContext))

  const defaultExcludedVariants = [
    'never-stable',
    'arm64',
    'ppc64le',
    's390x',
    'heterogeneous',
    'aggregated',
  ]
  const [excludedVariants = defaultExcludedVariants, setExcludedVariantsParam] =
    useQueryParam('excludedVariants', ArrayParam)

  const setExcludedVariants = (values) => {
    setExcludedVariantsParam(values)
    setLoaded(false)
  }

  const fetchData = () => {
    let queryParams = 'release=' + props.release

    if (excludedVariants.length > 0) {
      queryParams +=
        '&' +
        excludedVariants.map((value) => `excludedVariant=${value}`).join('&')
    }

    fetch(process.env.REACT_APP_API_URL + '/api/health?' + queryParams)
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('server returned ' + response.status)
        }
        return response.json()
      })
      .then((json) => {
        setData(json)
        setLoaded(true)
      })
      .catch((error) => {
        setFetchError(
          'Could not retrieve release ' + props.release + ', ' + error
        )
      })
  }

  useEffect(() => {
    document.title = `Sippy > ${props.release} > Health Summary`
    fetchData()
  }, [excludedVariants])

  if (fetchError !== '') {
    return <Alert severity="error">{fetchError}</Alert>
  }

  if (!isLoaded) {
    return <p>Loading...</p>
  }

  const warnings = []
  if (data.warnings && data.warnings.length > 0) {
    data.warnings.forEach((warning, index) => {
      warnings.push(
        <Alert
          key={'sippy-warning-' + index}
          className={classes.warning}
          severity="warning"
        >
          <div
            style={{ width: '100%' }}
            dangerouslySetInnerHTML={{ __html: warning }}
          ></div>
        </Alert>
      )
    })
  }

  return (
    <Fragment>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <SimpleBreadcrumbs release={props.release} />
        <VariantSelector
          defaultExcludedVariants={defaultExcludedVariants}
          excludedVariants={excludedVariants}
          setExcludedVariants={setExcludedVariants}
          release={props.release}
        />
      </Box>
      <div className="{classes.root}" style={{ padding: 20 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" gutterBottom className={classes.title}>
            CI Release {props.release} Health Summary
          </Typography>
          <Grid container spacing={3} alignItems="stretch">
            {warnings}
            <TopLevelIndicators
              release={props.release}
              indicators={data.indicators}
            />

            <Grid item md={5} sm={12}>
              <Card elevation={5} style={{ padding: 20, height: '100%' }}>
                <Typography variant="h6">
                  <Link
                    to={withSort(
                      pathForJobsWithFilter(props.release, {
                        items: withoutVariants(excludedVariants),
                      }),
                      'current_pass_percentage',
                      'asc'
                    )}
                  >
                    Job histogram
                  </Link>
                  <Tooltip
                    title={
                      'Histogram of job pass rates for frequently running jobs. Bucketed by current period pass percentage. ' +
                      'Tech preview and never-stable jobs are excluded. The solid line indicates the current ' +
                      "period's mean, and the dashed line is the previous period."
                    }
                  >
                    <InfoIcon />
                  </Tooltip>
                </Typography>
                <Histogram
                  data={data.current_statistics.histogram}
                  current_mean={data.current_statistics.mean}
                  previous_mean={data.previous_statistics.mean}
                  release={props.release}
                />
                <div align="center">
                  <span style={{ marginRight: 10 }}>
                    1Q: {data.current_statistics.quartiles[0].toFixed(0)}%
                  </span>
                  <span style={{ marginRight: 10 }}>
                    2Q: {data.current_statistics.quartiles[1].toFixed(0)}%
                  </span>
                  <span style={{ marginRight: 10 }}>
                    3Q: {data.current_statistics.quartiles[2].toFixed(0)}%
                  </span>
                  <span style={{ marginRight: 10 }}>
                    SD: {data.current_statistics.standard_deviation.toFixed(2)}
                  </span>
                </div>
              </Card>
            </Grid>

            <Grid item md={7}>
              <Card elevation={5} style={{ padding: 20, height: '100%' }}>
                <Typography variant="h6">
                  <Link
                    to={`/jobs/${
                      props.release
                    }/analysis?filters=${safeEncodeURIComponent(
                      JSON.stringify({
                        items: [
                          ...withoutVariants(excludedVariants),
                          ...dayFilter(14, startDate),
                        ],
                        linkOperator: 'and',
                      })
                    )}&period=day}`}
                  >
                    Last 14 days
                  </Link>
                  <Tooltip
                    title={'This chart shows a 14 day period of job runs'}
                  >
                    <InfoIcon />
                  </Tooltip>
                </Typography>
                <JobStackedChart
                  release={props.release}
                  period="day"
                  filter={{
                    items: [
                      ...withoutVariants(excludedVariants),
                      ...dayFilter(14, startDate),
                    ],
                    linkOperator: 'and',
                  }}
                />
              </Card>
            </Grid>

            <CapabilitiesContext.Consumer>
              {(value) => {
                if (!value.includes('openshift_releases')) {
                  return
                }

                return (
                  <Grid item md={12}>
                    <Typography style={{ textAlign: 'left' }} variant="h5">
                      <Link to={`/release/${props.release}/tags`}>
                        Payload acceptance
                      </Link>
                      <Tooltip
                        title={
                          'These cards show the last accepted payload for each architecture/stream combination.'
                        }
                      >
                        <InfoIcon />
                      </Tooltip>
                    </Typography>

                    <Card
                      elevation={5}
                      style={{
                        width: '100%',
                        padding: 10,
                        marginRight: 20,
                        margin: 10,
                      }}
                    >
                      <Grid
                        container
                        spacing={3}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <ReleasePayloadAcceptance release={props.release} />
                      </Grid>
                    </Card>
                  </Grid>
                )
              }}
            </CapabilitiesContext.Consumer>

            <Grid item md={12}>
              <VariantCards
                release={props.release}
                excludedVariants={excludedVariants}
              />
            </Grid>

            <Grid item md={6} sm={12}>
              <Card elevation={5} style={{ textAlign: 'center' }}>
                <Typography
                  component={Link}
                  to={`/jobs/${
                    props.release
                  }?sortField=net_improvement&sort=asc&${queryForBookmark(
                    BOOKMARKS.RUN_7,
                    BOOKMARKS.NO_STEP_GRAPH,
                    ...withoutVariants(excludedVariants)
                  )}`}
                  style={{ textAlign: 'center' }}
                  variant="h5"
                >
                  Most regressed jobs
                  <Tooltip title={REGRESSED_TOOLTIP}>
                    <InfoIcon />
                  </Tooltip>
                </Typography>

                <JobTable
                  hideControls={true}
                  sortField="net_improvement"
                  sort="asc"
                  limit={10}
                  rowsPerPageOptions={[5]}
                  filterModel={{
                    items: [
                      BOOKMARKS.RUN_7,
                      BOOKMARKS.NO_STEP_GRAPH,
                      ...withoutVariants(excludedVariants),
                    ],
                  }}
                  pageSize={5}
                  release={props.release}
                  briefTable={true}
                />
              </Card>
            </Grid>
            <Grid item md={6} sm={12}>
              <Card elevation={5} style={{ textAlign: 'center' }}>
                <Typography
                  component={Link}
                  to={`/jobs/${
                    props.release
                  }?period=twoDay&sortField=net_improvement&sort=asc&${queryForBookmark(
                    BOOKMARKS.RUN_2,
                    ...withoutVariants(excludedVariants)
                  )}`}
                  variant="h5"
                >
                  Most regressed jobs (two day)
                  <Tooltip title={TWODAY_WARNING}>
                    <InfoIcon />
                  </Tooltip>
                </Typography>

                <JobTable
                  hideControls={true}
                  sortField="net_improvement"
                  sort="asc"
                  limit={10}
                  rowsPerPageOptions={[5]}
                  filterModel={{
                    items: [
                      BOOKMARKS.RUN_2,
                      ...withoutVariants(excludedVariants),
                    ],
                  }}
                  pageSize={5}
                  period="twoDay"
                  release={props.release}
                  briefTable={true}
                />
              </Card>
            </Grid>

            <Grid item md={6} sm={12}>
              <Card elevation={5} style={{ textAlign: 'center' }}>
                <Typography
                  component={Link}
                  to={`/tests/${props.release}?${queryForBookmark(
                    BOOKMARKS.RUN_7,
                    BOOKMARKS.WITHOUT_OVERALL_JOB_RESULT,
                    BOOKMARKS.NO_STEP_GRAPH,
                    ...withoutVariants(excludedVariants)
                  )}&sortField=net_working_improvement&sort=asc`}
                  style={{ textAlign: 'center' }}
                  variant="h5"
                >
                  Most regressed tests
                  <Tooltip title={REGRESSED_TOOLTIP}>
                    <InfoIcon />
                  </Tooltip>
                </Typography>

                <Container size="xl">
                  <TestTable
                    hideControls={true}
                    sortField="net_working_improvement"
                    sort="asc"
                    limit={10}
                    rowsPerPageOptions={[5]}
                    filterModel={{
                      items: [
                        BOOKMARKS.RUN_7,
                        BOOKMARKS.WITHOUT_OVERALL_JOB_RESULT,
                        BOOKMARKS.NO_STEP_GRAPH,
                        ...withoutVariants(excludedVariants),
                      ],
                    }}
                    pageSize={5}
                    briefTable={true}
                    release={props.release}
                  />
                </Container>
              </Card>
            </Grid>

            <Grid item md={6} sm={12}>
              <Card elevation={5} style={{ textAlign: 'center' }}>
                <Typography
                  component={Link}
                  to={`/tests/${
                    props.release
                  }?period=twoDay&sortField=net_working_improvement&sort=asc&${queryForBookmark(
                    BOOKMARKS.RUN_2,
                    BOOKMARKS.WITHOUT_OVERALL_JOB_RESULT,
                    BOOKMARKS.NO_STEP_GRAPH,
                    ...withoutVariants(excludedVariants)
                  )}`}
                  style={{ textAlign: 'center' }}
                  variant="h5"
                >
                  Most regressed tests (two day)
                  <Tooltip title={TWODAY_WARNING}>
                    <InfoIcon />
                  </Tooltip>
                </Typography>
                <Container size="xl">
                  <TestTable
                    hideControls={true}
                    sortField="net_working_improvement"
                    sort="asc"
                    limit={10}
                    rowsPerPageOptions={[5]}
                    filterModel={{
                      items: [
                        BOOKMARKS.RUN_2,
                        BOOKMARKS.WITHOUT_OVERALL_JOB_RESULT,
                        BOOKMARKS.NO_STEP_GRAPH,
                        ...withoutVariants(excludedVariants),
                      ],
                    }}
                    pageSize={5}
                    period="twoDay"
                    release={props.release}
                    briefTable={true}
                  />
                </Container>
              </Card>
            </Grid>

            <Grid item md={6} sm={12}>
              <Card elevation={5} style={{ textAlign: 'center' }}>
                <Typography
                  component={Link}
                  to={`/tests/${props.release}/details?${queryForBookmark(
                    BOOKMARKS.RUN_7,
                    BOOKMARKS.WITHOUT_OVERALL_JOB_RESULT,
                    BOOKMARKS.NO_STEP_GRAPH,
                    BOOKMARKS.HIGH_DELTA_FROM_WORKING_AVERAGE,
                    BOOKMARKS.HIGH_STANDARD_DEVIATION,
                    ...withoutVariants(excludedVariants)
                  )}&sortField=delta_from_working_average&sort=asc`}
                  style={{ textAlign: 'center' }}
                  variant="h5"
                >
                  Top failing test NURPs
                  <Tooltip
                    title={
                      'Show the list of tests with a variant that perform significantly worse than the other variants of the same tests.'
                    }
                  >
                    <InfoIcon />
                  </Tooltip>
                </Typography>

                <Container size="xl">
                  <TestTable
                    collapse={false}
                    overall={false}
                    hideControls={true}
                    sortField="delta_from_working_average"
                    sort="asc"
                    limit={10}
                    rowsPerPageOptions={[5]}
                    filterModel={{
                      items: [
                        BOOKMARKS.RUN_7,
                        BOOKMARKS.WITHOUT_OVERALL_JOB_RESULT,
                        BOOKMARKS.NO_STEP_GRAPH,
                        BOOKMARKS.HIGH_DELTA_FROM_WORKING_AVERAGE,
                        BOOKMARKS.HIGH_STANDARD_DEVIATION,
                        ...withoutVariants(excludedVariants),
                      ],
                    }}
                    pageSize={5}
                    briefTable={true}
                    release={props.release}
                  />
                </Container>
              </Card>
            </Grid>

            <Grid item md={6} sm={12}>
              <Card elevation={5} style={{ textAlign: 'center' }}>
                <Typography
                  component={Link}
                  to={`/tests/${props.release}?${queryForBookmark(
                    BOOKMARKS.RUN_7,
                    BOOKMARKS.WITHOUT_OVERALL_JOB_RESULT,
                    BOOKMARKS.NO_STEP_GRAPH,
                    ...withoutVariants(excludedVariants)
                  )}&sortField=current_working_percentage&sort=asc`}
                  style={{ textAlign: 'center' }}
                  variant="h5"
                >
                  Top failing tests
                  <Tooltip title={TOP_FAILERS_TOOLTIP}>
                    <InfoIcon />
                  </Tooltip>
                </Typography>

                <Container size="xl">
                  <TestTable
                    hideControls={true}
                    sortField="current_working_percentage"
                    sort="asc"
                    limit={10}
                    rowsPerPageOptions={[5]}
                    filterModel={{
                      items: [
                        BOOKMARKS.RUN_7,
                        BOOKMARKS.WITHOUT_OVERALL_JOB_RESULT,
                        BOOKMARKS.NO_STEP_GRAPH,
                        ...withoutVariants(excludedVariants),
                      ],
                    }}
                    pageSize={5}
                    briefTable={true}
                    release={props.release}
                  />
                </Container>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </div>
    </Fragment>
  )
}

ReleaseOverview.propTypes = {
  release: PropTypes.string.isRequired,
}
