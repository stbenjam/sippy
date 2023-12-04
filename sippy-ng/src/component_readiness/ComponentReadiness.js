import './ComponentReadiness.css'
import {
  ArrayParam,
  BooleanParam,
  NumberParam,
  SafeStringParam,
  StringParam,
  useQueryParam,
} from 'use-query-params'
import {
  Button,
  Checkbox,
  Drawer,
  FormControlLabel,
  Grid,
  TableContainer,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  cancelledDataTable,
  formatLongDate,
  formatLongEndDate,
  formColumnName,
  getAPIUrl,
  getColumns,
  getKeeperColumns,
  getUpdatedUrlParts,
  gotFetchError,
  initialPageTable,
  makePageTitle,
  makeRFC3339Time,
  mergeRegressedTests,
  noDataTable,
} from './CompReadyUtils'
import { ClassNameMap } from '@mui/styles'
import { Fragment, useContext, useEffect, useState } from 'react'
import { Route, Switch, useRouteMatch } from 'react-router-dom'

import { grey } from '@mui/material/colors'
import { makeStyles, useTheme } from '@mui/styles'
import { ReleasesContext } from '../App'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import clsx from 'clsx'
import CompReadyCancelled from './CompReadyCancelled'
import CompReadyEnvCapabilities from './CompReadyEnvCapabilities'
import CompReadyEnvCapability from './CompReadyEnvCapability'
import CompReadyEnvCapabilityTest from './CompReadyEnvCapabilityTest'
import CompReadyMainInputs from './CompReadyMainInputs'
import CompReadyPageTitle from './CompReadyPageTitle'
import CompReadyProgress from './CompReadyProgress'
import CompReadyRow from './CompReadyRow'
import CompReadyTestReport from './CompReadyTestReport'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import React from 'react'
import RegressedTestsModal from './RegressedTestsModal'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

const drawerWidth = 240

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexGrow: 1,
  },
  title: {
    flexGrow: 1,
  },
  appBar: {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end',
  },
  content: {
    maxWidth: '100%',
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: -drawerWidth,
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  },

  // Table styling

  crColResultFull: {
    backgroundColor: theme.palette.mode === 'dark' ? grey[800] : 'whitesmoke',
    fontWeight: 'bold',
    position: 'sticky',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  crColResult: {
    hyphens: 'auto',
    verticalAlign: 'top !important',
    backgroundColor: theme.palette.mode === 'dark' ? grey[800] : 'whitesmoke',
    fontWeight: 'bold',
    position: 'sticky',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  componentName: {
    width: 175,
    minWidth: 175,
    maxWidth: 175,
    backgroundColor: theme.palette.mode === 'dark' ? grey[800] : 'whitesmoke',
    fontWeight: 'bold',
    position: 'sticky',
    left: 0,
    zIndex: 1,
  },
  crCellResult: {
    backgroundColor: theme.palette.mode === 'dark' ? grey[100] : 'white',
    height: 50,
    width: 50,
    padding: '5px !important',
    lineHeight: '13px !important',
    border: '1px solid #EEE',
  },
  crCellName: {
    fontSize: '11px !important',
  },
  crCellCapabCol: {
    fontSize: '11px !important',
    width: '300px',
  },
}))

export const ComponentReadinessStyleContext = React.createContext({})

// Big query requests take a while so give the user the option to
// abort in case they inadvertently requested a huge dataset.
let abortController = new AbortController()
const cancelFetch = () => {
  abortController.abort()
}

export default function ComponentReadiness(props) {
  const releases = useContext(ReleasesContext)
  const defaultBaseRelease = '4.14'
  const getReleaseDate = (release) => {
    if (releases.ga_dates && releases.ga_dates[release]) {
      return new Date(releases.ga_dates[release])
    }

    return new Date()
  }
  const days = 24 * 60 * 60 * 1000
  const weeks = days * 7
  const now = new Date()

  // Sample is last 7 days by default
  const initialSampleStartTime = new Date(now.getTime() - 7 * days)
  const initialSampleEndTime = new Date(now.getTime())

  // Base is 30 days from GA or now
  const initialBaseEndTime = getReleaseDate(defaultBaseRelease)
  const initialBaseStartTime = initialBaseEndTime.getTime() - 4 * weeks

  const setBaseReleaseWithDates = (event) => {
    let release = event.target.value
    let endTime = getReleaseDate(release)
    let startTime = endTime.getTime() - 30 * days
    setBaseRelease(release)
    setBaseStartTime(formatLongDate(startTime))
    setBaseEndTime(formatLongDate(endTime))
  }

  const setSampleReleaseWithDates = (event) => {
    let release = event.target.value
    setSampleRelease(release)
    setSampleStartTime(formatLongDate(initialSampleStartTime))
    setSampleEndTime(formatLongDate(initialSampleEndTime))
  }

  const theme = useTheme()
  const classes = useStyles(theme)

  const [searchComponentRegex, setSearchComponentRegex] = useState('')
  const handleSearchComponentRegexChange = (event) => {
    const searchValue = event.target.value
    setSearchComponentRegex(searchValue)
  }
  const [searchColumnRegex, setSearchColumnRegex] = useState('')
  const handleSearchColumnRegexChange = (event) => {
    const searchValue = event.target.value
    setSearchColumnRegex(searchValue)
  }

  const [redOnlyChecked, setRedOnlyChecked] = React.useState(false)
  const handleRedOnlyCheckboxChange = (event) => {
    setRedOnlyChecked(event.target.checked)
  }

  const [drawerOpen, setDrawerOpen] = React.useState(true)
  const handleDrawerOpen = () => {
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
  }

  // Create the variables for the URL and set any initial values.
  const [baseReleaseParam = defaultBaseRelease, setBaseReleaseParam] =
    useQueryParam('baseRelease', StringParam)
  const [
    baseStartTimeParam = formatLongDate(initialBaseStartTime),
    setBaseStartTimeParam,
  ] = useQueryParam('baseStartTime', StringParam)
  const [
    baseEndTimeParam = formatLongDate(initialBaseEndTime),
    setBaseEndTimeParam,
  ] = useQueryParam('baseEndTime', StringParam)
  const [sampleReleaseParam = '4.15', setSampleReleaseParam] = useQueryParam(
    'sampleRelease',
    StringParam
  )
  const [
    sampleStartTimeParam = formatLongDate(initialSampleStartTime),
    setSampleStartTimeParam,
  ] = useQueryParam('sampleStartTime', StringParam)
  const [
    sampleEndTimeParam = formatLongDate(initialSampleEndTime),
    setSampleEndTimeParam,
  ] = useQueryParam('sampleEndTime', StringParam)
  const [
    groupByCheckedItemsParam = ['cloud', 'arch', 'network'],
    setGroupByCheckedItemsParam,
  ] = useQueryParam('groupBy', ArrayParam)
  const [
    excludeCloudsCheckedItemsParam = [
      'openstack',
      'alibaba',
      'ibmcloud',
      'libvirt',
      'ovirt',
      'unknown',
    ],
    setExcludeCloudsCheckedItemsParam,
  ] = useQueryParam('excludeClouds', ArrayParam)
  const [
    excludeArchesCheckedItemsParam = [
      'arm64',
      'heterogeneous',
      'ppc64le',
      's390x',
    ],
    setExcludeArchesCheckedItemsParam,
  ] = useQueryParam('excludeArches', ArrayParam)
  const [
    excludeNetworksCheckedItemsParam = [],
    setExcludeNetworksCheckedItemsParam,
  ] = useQueryParam('excludeNetworks', ArrayParam)
  const [
    excludeUpgradesCheckedItemsParam = [],
    setExcludeUpgradesCheckedItemsParam,
  ] = useQueryParam('excludeUpgrades', ArrayParam)
  const [
    excludeVariantsCheckedItemsParam = [
      'hypershift',
      'osd',
      'microshift',
      'techpreview',
      'single-node',
      'assisted',
      'compact',
    ],
    setExcludeVariantsCheckedItemsParam,
  ] = useQueryParam('excludeVariants', ArrayParam)

  const [confidenceParam = 95, setConfidenceParam] = useQueryParam(
    'confidence',
    NumberParam
  )
  const [pityParam = 5, setPityParam] = useQueryParam('pity', NumberParam)
  const [minFailParam = 3, setMinFailParam] = useQueryParam(
    'minFail',
    NumberParam
  )
  const [ignoreMissingParam = false, setIgnoreMissingParam] = useQueryParam(
    'ignoreMissing',
    BooleanParam
  )
  const [ignoreDisruptionParam = false, setIgnoreDisruptionParam] =
    useQueryParam('ignoreDisruption', BooleanParam)

  const [componentParam, setComponentParam] = useQueryParam(
    'component',
    SafeStringParam
  )
  const [environmentParam, setEnvironmentParam] = useQueryParam(
    'environment',
    StringParam
  )
  const [capabilityParam, setCapabilityParam] = useQueryParam(
    'capability',
    StringParam
  )
  const [testIdParam, setTestIdParam] = useQueryParam('testId', StringParam)
  const [testNameParam, setTestNameParam] = useQueryParam('testName', String)

  // Create the variables to be used for api calls; these are initilized to the
  // value of the variables that got their values from the URL.
  const [groupByCheckedItems, setGroupByCheckedItems] = React.useState(
    groupByCheckedItemsParam
  )
  const [component, setComponent] = React.useState(componentParam)
  const [environment, setEnvironment] = React.useState(environmentParam)
  const [capability, setCapability] = React.useState(capabilityParam)
  const [testId, setTestId] = React.useState(testIdParam)
  const [testName, setTestName] = React.useState(testNameParam)

  const [excludeCloudsCheckedItems, setExcludeCloudsCheckedItems] =
    React.useState(excludeCloudsCheckedItemsParam)
  const [excludeArchesCheckedItems, setExcludeArchesCheckedItems] =
    React.useState(excludeArchesCheckedItemsParam)
  const [excludeNetworksCheckedItems, setExcludeNetworksCheckedItems] =
    React.useState(excludeNetworksCheckedItemsParam)

  const [baseRelease, setBaseRelease] = React.useState(baseReleaseParam)

  const [sampleRelease, setSampleRelease] = React.useState(sampleReleaseParam)

  const [baseStartTime, setBaseStartTime] = React.useState(baseStartTimeParam)

  const [baseEndTime, setBaseEndTime] = React.useState(baseEndTimeParam)

  const [sampleStartTime, setSampleStartTime] =
    React.useState(sampleStartTimeParam)
  const [sampleEndTime, setSampleEndTime] = React.useState(sampleEndTimeParam)
  const [excludeUpgradesCheckedItems, setExcludeUpgradesCheckedItems] =
    React.useState(excludeUpgradesCheckedItemsParam)
  const [excludeVariantsCheckedItems, setExcludeVariantsCheckedItems] =
    React.useState(excludeVariantsCheckedItemsParam)

  const [confidence, setConfidence] = React.useState(confidenceParam)
  const [pity, setPity] = React.useState(pityParam)
  const [minFail, setMinFail] = React.useState(minFailParam)

  // for the two boolean values here, we need the || false because otherwise
  // the value will be null.
  const [ignoreMissing, setIgnoreMissing] = React.useState(
    ignoreMissingParam || false
  )
  const [ignoreDisruption, setIgnoreDisruption] = React.useState(
    ignoreDisruptionParam || true
  )

  const { path, url } = useRouteMatch()

  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [data, setData] = React.useState({})

  const [regressedTestDialog = false, setRegressedTestDialog] = useQueryParam(
    'regressedModal',
    BooleanParam
  )

  const closeRegressedTestsDialog = () => {
    setRegressedTestDialog(false)
  }

  document.title = `Sippy > Component Readiness`
  if (fetchError !== '') {
    return gotFetchError(fetchError)
  }

  // Show the current state of the filter variables and the url.
  // Create API call string and return it.
  const showValuesForReport = () => {
    const apiCallStr =
      getAPIUrl() +
      getUpdatedUrlParts(
        baseRelease,
        baseStartTime,
        baseEndTime,
        sampleRelease,
        sampleStartTime,
        sampleEndTime,
        groupByCheckedItems,
        excludeCloudsCheckedItems,
        excludeArchesCheckedItems,
        excludeNetworksCheckedItems,
        excludeUpgradesCheckedItems,
        excludeVariantsCheckedItems,
        confidence,
        pity,
        minFail,
        ignoreDisruption,
        ignoreMissing
      )
    const formattedApiCallStr = makeRFC3339Time(apiCallStr)
    return formattedApiCallStr
  }

  const columnNames = getColumns(data)
  if (columnNames[0] === 'Cancelled' || columnNames[0] === 'None') {
    return (
      <CompReadyCancelled
        message={columnNames[0]}
        apiCallStr={showValuesForReport()}
      />
    )
  }

  const regressedTests = mergeRegressedTests(data)

  const keepColumnsList =
    data &&
    data.rows &&
    data.rows.length > 1 &&
    getKeeperColumns(data, columnNames, redOnlyChecked)

  const fetchData = () => {
    const formattedApiCallStr = showValuesForReport()
    fetch(formattedApiCallStr, { signal: abortController.signal })
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('API server returned ' + response.status)
        }
        return response.json()
      })
      .then((json) => {
        if (Object.keys(json).length === 0 || json.rows.length === 0) {
          // The api call returned 200 OK but the data was empty
          setData(noDataTable)
        } else {
          setData(json)
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          setData(cancelledDataTable)

          // Once this fired, we need a new one for the next button click.
          abortController = new AbortController()
        } else {
          setFetchError(`API call failed: ${formattedApiCallStr}\n${error}`)
        }
      })
      .finally(() => {
        // Mark the attempt as finished whether successful or not.
        setIsLoaded(true)
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  // This runs when someone pushes the "Generate Report" button.
  // We form an api string and then call the api.
  const handleGenerateReport = (event) => {
    event.preventDefault()
    setBaseReleaseParam(baseRelease)
    setBaseStartTimeParam(formatLongDate(baseStartTime))
    setBaseEndTimeParam(formatLongDate(baseEndTime))
    setSampleReleaseParam(sampleRelease)
    setSampleStartTimeParam(formatLongDate(sampleStartTime))
    setSampleEndTimeParam(formatLongDate(sampleEndTime))
    setGroupByCheckedItemsParam(groupByCheckedItems)
    setExcludeCloudsCheckedItemsParam(excludeCloudsCheckedItems)
    setExcludeArchesCheckedItemsParam(excludeArchesCheckedItems)
    setExcludeNetworksCheckedItemsParam(excludeNetworksCheckedItems)
    setExcludeUpgradesCheckedItemsParam(excludeUpgradesCheckedItems)
    setExcludeVariantsCheckedItemsParam(excludeVariantsCheckedItems)
    setConfidenceParam(confidence)
    setPityParam(pity)
    setMinFailParam(minFail)
    setIgnoreDisruptionParam(ignoreDisruption)
    setIgnoreMissingParam(ignoreMissing)
    setComponentParam(component)
    setEnvironmentParam(environment)
    setCapabilityParam(capability)
  }

  if (!isLoaded) {
    return (
      <CompReadyProgress
        apiLink={showValuesForReport()}
        cancelFunc={cancelFetch}
      />
    )
  }

  const pageTitle = makePageTitle(
    `Component Readiness for ${sampleRelease} vs. ${baseRelease}`,
    `page 1`,
    `rows: ${data && data.rows ? data.rows.length : 0}, columns: ${
      data && data.rows && data.rows[0] && data.rows[0].columns
        ? data.rows[0].columns.length
        : 0
    }`
  )

  return (
    <ComponentReadinessStyleContext.Provider value={classes}>
      <Route
        path={path}
        render={({ location }) => (
          <Fragment>
            <Grid
              container
              justifyContent="center"
              size="xl"
              className="cr-view"
            ></Grid>
            {/* eslint-disable react/prop-types */}
            <Switch>
              <Route
                path="/component_readiness/test_details"
                render={(props) => {
                  // We need to pass the testId and testName
                  const filterVals = getUpdatedUrlParts(
                    baseRelease,
                    baseStartTime,
                    baseEndTime,
                    sampleRelease,
                    sampleStartTime,
                    sampleEndTime,
                    groupByCheckedItems,
                    excludeCloudsCheckedItems,
                    excludeArchesCheckedItems,
                    excludeNetworksCheckedItems,
                    excludeUpgradesCheckedItems,
                    excludeVariantsCheckedItems,
                    confidence,
                    pity,
                    minFail,
                    ignoreDisruption,
                    ignoreMissing
                  )
                  setComponentParam(component)
                  setCapabilityParam(capability)
                  setTestIdParam(testId)
                  setTestNameParam(testName)
                  setEnvironmentParam(environment)
                  return (
                    <CompReadyTestReport
                      key="testreport"
                      filterVals={filterVals}
                      component={component}
                      capability={capability}
                      environment={environment}
                      testId={testId}
                      testName={testName}
                    ></CompReadyTestReport>
                  )
                }}
              />
              <Route
                path="/component_readiness/test"
                render={(props) => {
                  // We need to pass the testId
                  const filterVals = getUpdatedUrlParts(
                    baseRelease,
                    baseStartTime,
                    baseEndTime,
                    sampleRelease,
                    sampleStartTime,
                    sampleEndTime,
                    groupByCheckedItems,
                    excludeCloudsCheckedItems,
                    excludeArchesCheckedItems,
                    excludeNetworksCheckedItems,
                    excludeUpgradesCheckedItems,
                    excludeVariantsCheckedItems,
                    confidence,
                    pity,
                    minFail,
                    ignoreDisruption,
                    ignoreMissing
                  )
                  setComponentParam(component)
                  setCapabilityParam(capability)
                  setTestIdParam(testId)
                  return (
                    <CompReadyEnvCapabilityTest
                      key="capabilitytest"
                      filterVals={filterVals}
                      component={component}
                      capability={capability}
                      testId={testId}
                    ></CompReadyEnvCapabilityTest>
                  )
                }}
              />
              <Route
                path="/component_readiness/env_test"
                render={(props) => {
                  // We need to pass the environment and testId
                  const filterVals = getUpdatedUrlParts(
                    baseRelease,
                    baseStartTime,
                    baseEndTime,
                    sampleRelease,
                    sampleStartTime,
                    sampleEndTime,
                    groupByCheckedItems,
                    excludeCloudsCheckedItems,
                    excludeArchesCheckedItems,
                    excludeNetworksCheckedItems,
                    excludeUpgradesCheckedItems,
                    excludeVariantsCheckedItems,
                    confidence,
                    pity,
                    minFail,
                    ignoreDisruption,
                    ignoreMissing
                  )
                  setComponentParam(component)
                  setCapabilityParam(capability)
                  setEnvironmentParam(environment)
                  setTestIdParam(testId)
                  return (
                    <CompReadyEnvCapabilityTest
                      key="capabilitytest"
                      filterVals={filterVals}
                      component={component}
                      capability={capability}
                      testId={testId}
                      environment={environment}
                    ></CompReadyEnvCapabilityTest>
                  )
                }}
              />
              <Route
                path="/component_readiness/capability"
                render={(props) => {
                  // We need the component and capability from url
                  const filterVals = getUpdatedUrlParts(
                    baseRelease,
                    baseStartTime,
                    baseEndTime,
                    sampleRelease,
                    sampleStartTime,
                    sampleEndTime,
                    groupByCheckedItems,
                    excludeCloudsCheckedItems,
                    excludeArchesCheckedItems,
                    excludeNetworksCheckedItems,
                    excludeUpgradesCheckedItems,
                    excludeVariantsCheckedItems,
                    confidence,
                    pity,
                    minFail,
                    ignoreDisruption,
                    ignoreMissing
                  )
                  setComponentParam(component)
                  setCapabilityParam(capability)
                  return (
                    <CompReadyEnvCapability
                      key="capabilities"
                      filterVals={filterVals}
                      component={component}
                      capability={capability}
                    ></CompReadyEnvCapability>
                  )
                }}
              />
              <Route
                path="/component_readiness/env_capability"
                render={(props) => {
                  // We need the component and capability and environment from url
                  const filterVals = getUpdatedUrlParts(
                    baseRelease,
                    baseStartTime,
                    baseEndTime,
                    sampleRelease,
                    sampleStartTime,
                    sampleEndTime,
                    groupByCheckedItems,
                    excludeCloudsCheckedItems,
                    excludeArchesCheckedItems,
                    excludeNetworksCheckedItems,
                    excludeUpgradesCheckedItems,
                    excludeVariantsCheckedItems,
                    confidence,
                    pity,
                    minFail,
                    ignoreDisruption,
                    ignoreMissing
                  )
                  return (
                    <CompReadyEnvCapability
                      key="capabilities"
                      filterVals={filterVals}
                      component={component}
                      capability={capability}
                      environment={environment}
                    ></CompReadyEnvCapability>
                  )
                }}
              />
              <Route
                path="/component_readiness/capabilities"
                render={(props) => {
                  const filterVals = getUpdatedUrlParts(
                    baseRelease,
                    baseStartTime,
                    baseEndTime,
                    sampleRelease,
                    sampleStartTime,
                    sampleEndTime,
                    groupByCheckedItems,
                    excludeCloudsCheckedItems,
                    excludeArchesCheckedItems,
                    excludeNetworksCheckedItems,
                    excludeUpgradesCheckedItems,
                    excludeVariantsCheckedItems,
                    confidence,
                    pity,
                    minFail,
                    ignoreDisruption,
                    ignoreMissing
                  )
                  return (
                    <CompReadyEnvCapabilities
                      filterVals={filterVals}
                      component={component}
                    ></CompReadyEnvCapabilities>
                  )
                }}
              />
              <Route
                path="/component_readiness/env_capabilities"
                render={(props) => {
                  const filterVals = getUpdatedUrlParts(
                    baseRelease,
                    baseStartTime,
                    baseEndTime,
                    sampleRelease,
                    sampleStartTime,
                    sampleEndTime,
                    groupByCheckedItems,
                    excludeCloudsCheckedItems,
                    excludeArchesCheckedItems,
                    excludeNetworksCheckedItems,
                    excludeUpgradesCheckedItems,
                    excludeVariantsCheckedItems,
                    confidence,
                    pity,
                    minFail,
                    ignoreDisruption,
                    ignoreMissing
                  )
                  setComponentParam(component)
                  setEnvironmentParam(environment)
                  // We normally would get the environment and pass it but it doesn't work
                  return (
                    <CompReadyEnvCapabilities
                      filterVals={filterVals}
                      component={component}
                      environment={environment}
                    ></CompReadyEnvCapabilities>
                  )
                }}
              />
              <Route
                path={'/component_readiness/main'}
                render={(props) => {
                  const filterVals = getUpdatedUrlParts(
                    baseRelease,
                    baseStartTime,
                    baseEndTime,
                    sampleRelease,
                    sampleStartTime,
                    sampleEndTime,
                    groupByCheckedItems,
                    excludeCloudsCheckedItems,
                    excludeArchesCheckedItems,
                    excludeNetworksCheckedItems,
                    excludeUpgradesCheckedItems,
                    excludeVariantsCheckedItems,
                    confidence,
                    pity,
                    minFail,
                    ignoreDisruption,
                    ignoreMissing
                  )
                  return (
                    <div className="cr-view">
                      <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleDrawerOpen}
                        edge="start"
                        className={clsx(
                          classes.menuButton,
                          drawerOpen && classes.hide
                        )}
                        size="large"
                      >
                        <MenuIcon />
                      </IconButton>
                      <Drawer
                        className={classes.drawer}
                        variant="persistent"
                        anchor="left"
                        open={drawerOpen}
                        classes={{
                          paper: classes.drawerPaper,
                        }}
                      >
                        <div className={classes.drawerHeader}>
                          <IconButton onClick={handleDrawerClose} size="large">
                            {theme.direction === 'ltr' ? (
                              <ChevronLeftIcon />
                            ) : (
                              <ChevronRightIcon />
                            )}
                          </IconButton>
                        </div>
                        <CompReadyMainInputs
                          baseRelease={baseRelease}
                          baseStartTime={formatLongDate(baseStartTime)}
                          baseEndTime={formatLongEndDate(baseEndTime)}
                          sampleRelease={sampleRelease}
                          sampleStartTime={formatLongDate(sampleStartTime)}
                          sampleEndTime={formatLongEndDate(sampleEndTime)}
                          groupByCheckedItems={groupByCheckedItems}
                          excludeCloudsCheckedItems={excludeCloudsCheckedItems}
                          excludeArchesCheckedItems={excludeArchesCheckedItems}
                          excludeNetworksCheckedItems={
                            excludeNetworksCheckedItems
                          }
                          excludeUpgradesCheckedItems={
                            excludeUpgradesCheckedItems
                          }
                          excludeVariantsCheckedItems={
                            excludeVariantsCheckedItems
                          }
                          confidence={confidence}
                          pity={pity}
                          minFail={minFail}
                          ignoreMissing={ignoreMissing}
                          ignoreDisruption={ignoreDisruption}
                          component={component}
                          environment={environment}
                          setBaseRelease={setBaseReleaseWithDates}
                          setSampleRelease={setSampleReleaseWithDates}
                          setBaseStartTime={setBaseStartTime}
                          setBaseEndTime={setBaseEndTime}
                          setSampleStartTime={setSampleStartTime}
                          setSampleEndTime={setSampleEndTime}
                          setGroupByCheckedItems={setGroupByCheckedItems}
                          setExcludeArchesCheckedItems={
                            setExcludeArchesCheckedItems
                          }
                          setExcludeNetworksCheckedItems={
                            setExcludeNetworksCheckedItems
                          }
                          setExcludeCloudsCheckedItems={
                            setExcludeCloudsCheckedItems
                          }
                          setExcludeUpgradesCheckedItems={
                            setExcludeUpgradesCheckedItems
                          }
                          setExcludeVariantsCheckedItems={
                            setExcludeVariantsCheckedItems
                          }
                          handleGenerateReport={handleGenerateReport}
                          setConfidence={setConfidence}
                          setPity={setPity}
                          setMinFail={setMinFail}
                          setIgnoreMissing={setIgnoreMissing}
                          setIgnoreDisruption={setIgnoreDisruption}
                        ></CompReadyMainInputs>
                      </Drawer>
                      <CompReadyPageTitle
                        pageTitle={pageTitle}
                        apiCallStr={showValuesForReport()}
                      />
                      {data === initialPageTable ? (
                        <Typography variant="h6" style={{ textAlign: 'left' }}>
                          To get started, make your filter selections on the
                          left, left, then click Generate Report
                        </Typography>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', gap: '16px' }}>
                            <TextField
                              variant="standard"
                              label="Search Component"
                              value={searchComponentRegex}
                              onChange={handleSearchComponentRegexChange}
                            />
                            <TextField
                              variant="standard"
                              label="Search Column"
                              value={searchColumnRegex}
                              onChange={handleSearchColumnRegexChange}
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={redOnlyChecked}
                                  onChange={handleRedOnlyCheckboxChange}
                                  color="primary"
                                  size="small"
                                  style={{ borderRadius: 1 }}
                                />
                              }
                              htmlFor="redOnlyCheckbox"
                              style={{
                                textAlign: 'left',
                                marginTop: 15,
                              }}
                              label="Red Only"
                            ></FormControlLabel>
                            <Button
                              style={{ marginTop: 20 }}
                              variant="contained"
                              color="secondary"
                              onClick={() => setRegressedTestDialog(true)}
                            >
                              Show Regressed
                            </Button>
                            <RegressedTestsModal
                              regressedTests={regressedTests}
                              filterVals={filterVals}
                              isOpen={regressedTestDialog}
                              close={closeRegressedTestsDialog}
                            />
                          </div>
                          <TableContainer
                            component="div"
                            className="cr-table-wrapper"
                          >
                            <Table className="cr-comp-read-table">
                              <TableHead>
                                <TableRow>
                                  {
                                    <TableCell
                                      className={classes.crColResultFull}
                                    >
                                      <Typography
                                        className={classes.crCellName}
                                      >
                                        Name
                                      </Typography>
                                    </TableCell>
                                  }
                                  {columnNames
                                    .filter(
                                      (column, idx) =>
                                        column.match(
                                          new RegExp(searchColumnRegex, 'i')
                                        ) && keepColumnsList[idx]
                                    )

                                    .map((column, idx) => {
                                      if (column !== 'Name') {
                                        return (
                                          <TableCell
                                            className={classes.crColResult}
                                            key={'column' + '-' + idx}
                                          >
                                            <Tooltip
                                              title={
                                                'Single row report for ' +
                                                column
                                              }
                                            >
                                              <Typography
                                                className={classes.crCellName}
                                              >
                                                {' '}
                                                {column}
                                              </Typography>
                                            </Tooltip>
                                          </TableCell>
                                        )
                                      }
                                    })}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.keys(data.rows)
                                  .filter((componentIndex) =>
                                    data.rows[componentIndex].component.match(
                                      new RegExp(searchComponentRegex, 'i')
                                    )
                                  )
                                  .filter((componentIndex) =>
                                    redOnlyChecked
                                      ? data.rows[componentIndex].columns.some(
                                          // Filter for rows where any of their columns have status <= -2 and accepted by the regex.
                                          (column) =>
                                            column.status <= -2 &&
                                            formColumnName(column).match(
                                              new RegExp(searchColumnRegex, 'i')
                                            )
                                        )
                                      : true
                                  )
                                  .map((componentIndex) => (
                                    <CompReadyRow
                                      key={componentIndex}
                                      componentName={
                                        data.rows[componentIndex].component
                                      }
                                      results={data.rows[
                                        componentIndex
                                      ].columns.filter(
                                        (column, idx) =>
                                          formColumnName(column).match(
                                            new RegExp(searchColumnRegex, 'i')
                                          ) && keepColumnsList[idx]
                                      )}
                                      columnNames={columnNames.filter(
                                        (column, idx) =>
                                          column.match(
                                            new RegExp(searchColumnRegex, 'i')
                                          ) && keepColumnsList[idx]
                                      )}
                                      grayFactor={redOnlyChecked ? 100 : 0}
                                      filterVals={filterVals}
                                    />
                                  ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </div>
                      )}
                    </div>
                  )
                }}
              />
            </Switch>
          </Fragment>
        )}
      />
    </ComponentReadinessStyleContext.Provider>
  )
}
