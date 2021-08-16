import { Box, Card, Container, Tooltip, Typography } from '@material-ui/core'
import Grid from '@material-ui/core/Grid'
import { createTheme, makeStyles } from '@material-ui/core/styles'
import InfoIcon from '@material-ui/icons/Info'
import Alert from '@material-ui/lab/Alert'
import React, { useEffect, Fragment } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import JobTable from '../jobs/JobTable'
import PassRateIcon from '../components/PassRateIcon'
import SimpleBreadcrumbs from '../components/SimpleBreadcrumbs'
import SummaryCard from '../components/SummaryCard'
import TestTable from '../tests/TestTable'
import { INFRASTRUCTURE_THRESHOLDS, INSTALL_THRESHOLDS, BOOKMARKS, UPGRADE_THRESHOLDS, VARIANT_THRESHOLDS } from '../constants'

export const TOOLTIP = 'Top level release indicators showing product health'
export const REGRESSED_TOOLTIP = 'Shows the most regressed items this week vs. last week, for those with more than 10 runs'
export const NOBUG_TOOLTIP = 'Shows the list of tests ordered by least successful and without a bug, for those with more than 10 runs'
export const TRT_TOOLTIP = 'Shows a curated list of tests selected by the TRT team'
export const TWODAY_WARNING = 'Shows the last 2 days compared to the last 7 days, sorted by most regressed.'

const defaultTheme = createTheme()
const useStyles = makeStyles(
  (theme) => ({
    root: {
      flexGrow: 1
    },
    card: {
      minWidth: 275,
      alignContent: 'center',
      margin: 'auto'
    },
    title: {
      textAlign: 'center'
    }
  }),
  { defaultTheme }
)

export default function ReleaseOverview (props) {
  const classes = useStyles()

  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [data, setData] = React.useState({})

  const fetchData = () => {
    fetch(process.env.REACT_APP_API_URL + '/api/health?release=' + props.release)
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('server returned ' + response.status)
        }
        return response.json()
      })
      .then(json => {
        setData(json)
        setLoaded(true)
      }).catch(error => {
        setFetchError('Could not retrieve release ' + props.release + ', ' + error)
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (fetchError !== '') {
    return <Alert severity="error">{fetchError}</Alert>
  }

  if (!isLoaded) {
    return <p>Loading...</p>
  }

  const indicatorCaption = (indicator) => {
    return (
            <Box component="h3">
                {indicator.current.percentage.toFixed(0)} % ({indicator.current.runs} runs)&nbsp;
                <PassRateIcon improvement={indicator.current.percentage - indicator.previous.percentage} /> &nbsp;
                {indicator.previous.percentage.toFixed(0)}% ({indicator.previous.runs} runs)
            </Box>
    )
  }

  const variantCaption = (variant) => {
    const total = variant.success + variant.unstable + variant.failed

    const success = variant.success / total * 100
    const flaked = variant.unstable / total * 100
    const failed = variant.failed / total * 100

    return (
            <Box component="h3">
                {success.toFixed(0)}% success, {flaked.toFixed(0)}% unstable, {failed.toFixed(0)}% failed
            </Box>
    )
  }

  return (
        <Fragment>
            <SimpleBreadcrumbs release={props.release} />
            <div className="{classes.root}" style={{ padding: 20 }}>
                <Container maxWidth="lg">
                    <Typography variant="h4" gutterBottom className={classes.title}>CI Release {props.release} Health Summary</Typography>
                    <Grid container spacing={3} alignItems="stretch">
                        <Grid item md={12} sm={12} style={{ display: 'flex' }}>
                            <Typography variant="h5">
                                Top Level Release Indicators
                                <Tooltip title={TOOLTIP}>
                                    <InfoIcon />
                                </Tooltip>
                            </Typography>
                        </Grid>
                        <Grid item md={3} sm={6}>
                            <SummaryCard
                                key="infrastructure-summary"
                                threshold={INFRASTRUCTURE_THRESHOLDS}
                                name="Infrastructure"
                                link={'/tests/' + props.release + '/details?test=[sig-sippy] infrastructure should work'}
                                success={data.indicators.infrastructure.current.percentage}
                                fail={100 - data.indicators.infrastructure.current.percentage}
                                caption={indicatorCaption(data.indicators.infrastructure)}
                                tooltip="How often we get to the point of running the installer. This is judged by whether a kube-apiserver is available, it's not perfect, but it's very close."
                            />
                        </Grid>
                        <Grid item md={3} sm={6}>
                            <SummaryCard
                                key="install-summary"
                                threshold={INSTALL_THRESHOLDS}
                                name="Install" link={'/install/' + props.release}
                                success={data.indicators.install.current.percentage}
                                fail={100 - data.indicators.install.current.percentage}
                                caption={indicatorCaption(data.indicators.install)}
                                tooltip="How often the install completes successfully."
                            />
                        </Grid>
                        <Grid item md={3} sm={6}>
                            <SummaryCard
                                key="upgrade-summary"
                                threshold={UPGRADE_THRESHOLDS}
                                name="Upgrade" link={'/upgrade/' + props.release}
                                success={data.indicators.upgrade.current.percentage}
                                fail={100 - data.indicators.upgrade.current.percentage}
                                caption={indicatorCaption(data.indicators.upgrade)}
                                tooltip="How often an upgrade that is started completes successfully."
                            />
                        </Grid>

                        <Grid item md={3} sm={6}>
                            <SummaryCard
                                key="variant-summary"
                                threshold={VARIANT_THRESHOLDS}
                                name="Variants" link={'/jobs/' + props.release + '/variant'}
                                success={data.variants.current.success}
                                fail={data.variants.current.failed}
                                flakes={data.variants.current.unstable}
                                caption={variantCaption(data.variants.current)}
                                tooltip="Overall health of variants excluding never-stable. Success is greater than 80% pass, unstable is greater than 60%, and anything else is considered failed."
                            />
                        </Grid>

                        <Grid item md={6} sm={12}>
                            <Card enhancement="5" style={{ textAlign: 'center' }}>
                                <Typography component={Link} to={'/tests/' + props.release + '?sortField=net_improvement&sort=asc&filters=' + encodeURIComponent(JSON.stringify({ items: [BOOKMARKS.RUN_10] }))} style={{ textAlign: 'center' }} variant="h5">
                                    Most regressed tests
                                    <Tooltip title={REGRESSED_TOOLTIP}>
                                        <InfoIcon />
                                    </Tooltip>
                                </Typography>

                                <TestTable
                                    hideControls={true}
                                    sortField="net_improvement"
                                    sort="asc"
                                    limit={10}
                                    filterModel={{
                                      items: [BOOKMARKS.RUN_10]
                                    }}
                                    pageSize={5}
                                    briefTable={true}
                                    release={props.release} />

                            </Card>
                        </Grid>

                        <Grid item md={6} sm={12}>
                            <Card enhancement="5" style={{ textAlign: 'center' }}>
                                <Typography component={Link} to={'/jobs/' + props.release + '?sortBy=regression&filterBy=runs&runs=10'} style={{ textAlign: 'center' }} variant="h5">
                                    Most regressed jobs
                                    <Tooltip title={REGRESSED_TOOLTIP}>
                                        <InfoIcon />
                                    </Tooltip>
                                </Typography>

                                <JobTable
                                    hideControls={true}
                                    sortBy="regression"
                                    limit={10}
                                    filterBy={['runs']}
                                    runs={10}
                                    pageSize={5}
                                    release={props.release}
                                    briefTable={true} />

                            </Card>
                        </Grid>

                        <Grid item md={6} sm={12}>
                            <Card enhancement="5" style={{ textAlign: 'center' }}>
                                <Typography component={Link} to={'/tests/' + props.release + '?sortBy=regression&filterBy=runs&runs=1&period=twoDay'} style={{ textAlign: 'center' }} variant="h5">
                                    Most regressed tests (two day)
                                    <Tooltip title={TWODAY_WARNING}>
                                        <InfoIcon />
                                    </Tooltip>
                                </Typography>

                                <TestTable
                                    hideControls={true}
                                    sortField="net_improvement"
                                    sort="asc"
                                    limit={10}
                                    filterModel={{
                                      items: [BOOKMARKS.RUN_1]
                                    }}
                                    pageSize={5}
                                    period="twoDay"
                                    release={props.release}
                                    briefTable={true} />
                            </Card>
                        </Grid>

                        <Grid item md={6} sm={12}>
                            <Card enhancement="5" style={{ textAlign: 'center' }}>
                                <Typography component={Link} to={'/jobs/' + props.release + '?sortBy=regression&filterBy=runs&runs=1&period=twoDay'} style={{ textAlign: 'center' }} variant="h5">
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
                                    filterModel={{
                                      items: [BOOKMARKS.RUN_1]
                                    }}
                                    pageSize={5}
                                    period="twoDay"
                                    release={props.release}
                                    briefTable={true} />
                            </Card>
                        </Grid>

                        <Grid item md={6} sm={12}>
                            <Card enhancement="5" style={{ textAlign: 'center' }}>
                                <Typography component={Link} to={'/tests/' + props.release + '?filterBy=runs&filterBy=noBug&runs=10'} style={{ textAlign: 'center' }} variant="h5">
                                    Top failing tests without a bug
                                    <Tooltip title={NOBUG_TOOLTIP}>
                                        <InfoIcon />
                                    </Tooltip>
                                </Typography>

                                <TestTable
                                    hideControls={true}
                                    sortField="net_improvement"
                                    sort="asc"
                                    filterModel={{
                                      items: [BOOKMARKS.RUN_10, BOOKMARKS.NO_LINKED_BUG]
                                    }}
                                    limit={10}
                                    pageSize={5}
                                    briefTable={true}
                                    release={props.release} />

                            </Card>
                        </Grid>

                        <Grid item md={6} sm={12}>
                            <Card enhancement="5" style={{ textAlign: 'center' }}>
                                <Typography component={Link} to={'/tests/' + props.release + '?filterBy=runs&filterBy=trt&runs=10'} style={{ textAlign: 'center' }} variant="h5">
                                    Curated by TRT
                                    <Tooltip title={TRT_TOOLTIP}>
                                        <InfoIcon />
                                    </Tooltip>
                                </Typography>

                                <TestTable
                                    hideControls={true}
                                    filterBy={['trt', 'runs']}
                                    runs={10}
                                    limit={10}
                                    pageSize={5}
                                    briefTable={true}
                                    release={props.release} />
                            </Card>
                        </Grid>

                    </Grid>
                </Container>
            </div>
        </Fragment>
  )
}

ReleaseOverview.propTypes = {
  release: PropTypes.string.isRequired
}
