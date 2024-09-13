import { createTheme, useTheme } from '@mui/material/styles'
import {
  CssBaseline,
  Grid,
  StyledEngineProvider,
  ThemeProvider,
  Tooltip,
} from '@mui/material'
import { cyan, green, orange, red } from '@mui/material/colors'
import { DarkMode, LightMode } from '@mui/icons-material'
import { getReportStartDate, relativeTime } from './helpers'
import { JobAnalysis } from './jobs/JobAnalysis'
import { makeStyles, styled } from '@mui/styles'
import { Navigate, Route, Routes } from 'react-router-dom'
import { parse, stringify } from 'query-string'
import { QueryParamProvider } from 'use-query-params'
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6'
import { TestAnalysis } from './tests/TestAnalysis'
import { useCookies } from 'react-cookie'
import Alert from '@mui/material/Alert'
import BuildClusterDetails from './build_clusters/BuildClusterDetails'
import BuildClusterOverview from './build_clusters/BuildClusterOverview'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ComponentReadiness from './component_readiness/ComponentReadiness'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Install from './releases/Install'
import Jobs from './jobs/Jobs'
import MenuIcon from '@mui/icons-material/Menu'
import MuiAppBar from '@mui/material/AppBar'
import PayloadStream from './releases/PayloadStream'
import PayloadStreams from './releases/PayloadStreams'
import ProwJobRun from './prow_job_runs/ProwJobRun'
import PullRequests from './pull_requests/PullRequests'
import React, { Fragment, useEffect } from 'react'
import ReleaseOverview from './releases/ReleaseOverview'
import ReleasePayloadDetails from './releases/ReleasePayloadDetails'
import ReleasePayloads from './releases/ReleasePayloads'
import Repositories from './repositories/Repositories'
import RepositoryDetails from './repositories/RepositoryDetails'
import Sidebar from './components/Sidebar'
import Tests from './tests/Tests'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Upgrades from './releases/Upgrades'
import VariantStatus from './jobs/VariantStatus'

const drawerWidth = 240

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    width: `100vw`,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  })
)

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}))

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}))

export const ReleasesContext = React.createContext({})
export const CapabilitiesContext = React.createContext([])
export const ReportEndContext = React.createContext('')
const ColorModeContext = React.createContext({ toggleColorMode: () => {} })

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexGrow: 1,
  },
  title: {
    flexGrow: 1,
  },
}))

const themes = {
  dark: {
    palette: {
      mode: 'dark',
    },
  },
  light: {
    palette: {
      mode: 'light',
      info: {
        main: cyan[500],
        light: cyan[300],
        dark: cyan[700],
      },
      success: {
        main: green[300],
        light: green[300],
        dark: green[700],
      },
      warning: {
        main: orange[500],
        light: orange[300],
        dark: orange[700],
      },
      error: {
        main: red[500],
        light: red[300],
        dark: red[700],
      },
    },
  },
}

export default function App(props) {
  const classes = useStyles()
  const theme = useTheme()
  const [cookies, setCookie] = useCookies(['sippyColorMode'])
  const colorModePreference = cookies['sippyColorMode']
  const systemPrefersDark = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches
  const [mode, setMode] = React.useState(
    colorModePreference === 'dark' || colorModePreference === 'light'
      ? colorModePreference
      : systemPrefersDark
      ? 'dark'
      : 'light'
  )

  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light'
          setCookie('sippyColorMode', newMode, {
            path: '/',
            sameSite: 'Strict',
            expires: new Date('3000-12-31'),
          })
          return newMode
        })
      },
    }),
    [setCookie]
  )

  const [lastUpdated, setLastUpdated] = React.useState(null)
  const [drawerOpen, setDrawerOpen] = React.useState(true)
  const [isLoaded, setLoaded] = React.useState(false)
  const [releases, setReleases] = React.useState([])
  const [capabilities, setCapabilities] = React.useState([])
  const [reportDate, setReportDate] = React.useState([])
  const [fetchError, setFetchError] = React.useState('')

  const fetchData = () => {
    Promise.all([
      fetch(process.env.REACT_APP_API_URL + '/api/releases'),
      fetch(process.env.REACT_APP_API_URL + '/api/capabilities'),
      fetch(process.env.REACT_APP_API_URL + '/api/report_date'),
    ])
      .then(([releases, capabilities, reportDate]) => {
        if (releases.status !== 200)
          throw new Error('server returned ' + releases.status)
        if (capabilities.status !== 200)
          throw new Error('server returned ' + capabilities.status)
        if (reportDate.status !== 200)
          throw new Error('server returned ' + reportDate.status)

        return Promise.all([
          releases.json(),
          capabilities.json(),
          reportDate.json(),
        ])
      })
      .then(([releases, capabilities, reportDate]) => {
        for (const key in releases.ga_dates) {
          if (releases.ga_dates[key]) {
            releases.ga_dates[key] = releases.ga_dates[key].replace('Z', '')
          }
        }
        setReleases(releases)
        setCapabilities(capabilities)
        setReportDate(reportDate['pinnedDateTime'])
        setLastUpdated(new Date(releases.last_updated))
        setLoaded(true)
      })
      .catch((error) => {
        setLoaded(true)
        setFetchError('could not retrieve data:' + error)
      })
  }

  useEffect(() => {
    if (!isLoaded) fetchData()
  }, [isLoaded])

  const handleDrawerOpen = () => {
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
  }

  const showWithCapability = (capability, el) => {
    return capabilities.includes(capability) ? el : null
  }

  if (!isLoaded) return <Typography>Loading...</Typography>

  let landingPage = ''
  if (fetchError !== '') {
    landingPage = <Alert severity="error">{fetchError}</Alert>
  } else if (releases?.releases?.length > 0) {
    landingPage = (
      <ReleaseOverview
        key={releases.releases[0]}
        release={releases.releases[0]}
      />
    )
  } else {
    landingPage = 'No releases found! Have you configured Sippy correctly?'
  }

  const startDate = getReportStartDate(reportDate)

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={createTheme(themes[mode])}>
        <StyledEngineProvider injectFirst>
          <ReleasesContext.Provider value={releases}>
            <ReportEndContext.Provider value={reportDate}>
              <CapabilitiesContext.Provider value={capabilities}>
                <CssBaseline />
                <QueryParamProvider
                  adapter={ReactRouter6Adapter}
                  options={{
                    searchStringToObject: parse,
                    objectToSearchString: stringify,
                  }}
                >
                  <div className={classes.root}>
                    <AppBar
                      position="fixed"
                      open={drawerOpen}
                      sx={{ bgcolor: '#3f51b5' }}
                    >
                      <Toolbar edge="start">
                        <IconButton
                          color="inherit"
                          aria-label="open drawer"
                          onClick={handleDrawerOpen}
                          edge="start"
                          sx={{ mr: 2, ...(drawerOpen && { display: 'none' }) }}
                        >
                          <MenuIcon />
                        </IconButton>
                        <Grid
                          container
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography variant="h6" className={classes.title}>
                            Sippy
                          </Typography>
                          {showWithCapability(
                            'local_db',
                            <Fragment>
                              Last updated{' '}
                              {lastUpdated !== null
                                ? relativeTime(lastUpdated, startDate)
                                : 'unknown'}
                            </Fragment>
                          )}
                        </Grid>
                      </Toolbar>
                    </AppBar>

                    <Drawer
                      sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                          width: drawerWidth,
                          boxSizing: 'border-box',
                        },
                      }}
                      variant="persistent"
                      anchor="left"
                      open={drawerOpen}
                    >
                      <DrawerHeader>
                        <Tooltip
                          title={
                            mode === 'dark'
                              ? 'Toggle light mode'
                              : 'Toggle dark mode'
                          }
                        >
                          <IconButton
                            sx={{ ml: 1 }}
                            onClick={colorMode.toggleColorMode}
                            color="inherit"
                          >
                            {mode === 'dark' ? <LightMode /> : <DarkMode />}
                          </IconButton>
                        </Tooltip>
                        <IconButton onClick={handleDrawerClose} size="large">
                          {theme.direction === 'ltr' ? (
                            <ChevronLeftIcon />
                          ) : (
                            <ChevronRightIcon />
                          )}
                        </IconButton>
                      </DrawerHeader>
                      <Sidebar releases={releases['releases']} />
                    </Drawer>

                    <Main open={drawerOpen}>
                      <DrawerHeader />
                      <Routes>
                        <Route
                          path="/release/:release/tags/:tag"
                          element={<ReleasePayloadDetails />}
                        />
                        <Route
                          path="/release/:release/streams/:arch/:stream"
                          element={<PayloadStream />}
                        />
                        <Route
                          path="/release/:release/streams"
                          element={<PayloadStreams />}
                        />
                        <Route
                          path="/release/:release/tags"
                          element={<ReleasePayloads />}
                        />
                        <Route
                          path="/release/:release"
                          element={<ReleaseOverview />}
                        />
                        <Route
                          path="/variants/:release/:variant"
                          element={<VariantStatus />}
                        />
                        <Route
                          path="/jobs/:release/analysis"
                          element={<JobAnalysis />}
                        />
                        <Route path="/jobs/:release" element={<Jobs />} />
                        <Route
                          path="/tests/:release/analysis"
                          element={<TestAnalysis />}
                        />
                        <Route path="/tests/:release" element={<Tests />} />
                        <Route
                          path="/upgrade/:release"
                          element={<Upgrades />}
                        />
                        <Route
                          path="/component_readiness"
                          element={<ComponentReadiness />}
                        />
                        <Route path="/install/:release" element={<Install />} />
                        <Route
                          path="/build_clusters/:cluster"
                          element={<BuildClusterDetails />}
                        />
                        <Route
                          path="/build_clusters"
                          element={<BuildClusterOverview />}
                        />
                        <Route
                          path="/repositories/:release/:org/:repo"
                          element={<RepositoryDetails />}
                        />
                        <Route
                          path="/repositories/:release"
                          element={<Repositories />}
                        />
                        <Route
                          path="/pull_requests/:release"
                          element={<PullRequests />}
                        />
                        <Route
                          path="/job_runs/:jobrunid/:jobname?/:repoinfo?/:pullnumber?/intervals"
                          element={<ProwJobRun />}
                        />
                        {capabilities.includes('local_db') ? (
                          <Route path="/sippy-ng" element={landingPage} />
                        ) : (
                          <Route
                            path="/sippy-ng"
                            element={
                              <Navigate to="/component_readiness/main" />
                            }
                          />
                        )}
                        <Route
                          path="/"
                          element={<Navigate to="/sippy-ng/" replace />}
                        />
                      </Routes>
                    </Main>
                  </div>
                </QueryParamProvider>
              </CapabilitiesContext.Provider>
            </ReportEndContext.Provider>
          </ReleasesContext.Provider>
        </StyledEngineProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}
