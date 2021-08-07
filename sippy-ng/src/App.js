import { Backdrop, CircularProgress, CssBaseline, Grid, ListSubheader, MuiThemeProvider, Tooltip } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import Collapse from '@material-ui/core/Collapse';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { createTheme, makeStyles, useTheme } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import { BugReport, ExpandLess, ExpandMore } from '@material-ui/icons';
import ApartmentIcon from '@material-ui/icons/Apartment';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import AssessmentIcon from '@material-ui/icons/Assessment';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import HomeIcon from '@material-ui/icons/Home';
import InfoIcon from '@material-ui/icons/Info';
import ListIcon from '@material-ui/icons/List';
import MenuIcon from '@material-ui/icons/Menu';
import NewReleasesIcon from '@material-ui/icons/NewReleases';
import SearchIcon from '@material-ui/icons/Search';
import Alert from '@material-ui/lab/Alert';
import clsx from 'clsx';
import React, { Fragment, useEffect } from 'react';
import {
  BrowserRouter as Router, Link, Route, Switch
} from "react-router-dom";
import { QueryParamProvider } from 'use-query-params';
import BugzillaSearch from './BugzillaSearch';
import Install from './Install';
import Jobs from './Jobs';
import ReleaseOverview from './ReleaseOverview';
import logo from "./sippy.svg";
import TestDetailTable from './TestDetailTable';
import TestTable from './TestTable';
import Upgrades from './Upgrades';
import './App.css';

const drawerWidth = 240;

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
}));

const lightMode = {
  palette: {
    type: 'light',
  },
};

export default function App(props) {
  const classes = useStyles();
  const theme = useTheme();


  const [lastUpdated, setLastUpdated] = React.useState(0);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [isLoaded, setLoaded] = React.useState(false);
  const [open, setOpen] = React.useState({});
  const [releases, setReleases] = React.useState([]);
  const [fetchError, setFetchError] = React.useState("");
  const [bugzillaOpen, setBugzillaOpen] = React.useState(false);

  let fetchReleases = () => {
    fetch(process.env.REACT_APP_API_URL + '/api/releases')
      .then((response) => {
        if (response.status !== 200) {
          setFetchError("Could not retrieve releases, server returned " + response.status)
        }
        return response.json();
      })
      .then(json => {
        if (json.releases) {
          setReleases(json.releases);
          setLastUpdated(new Date(json.last_updated));
          setLoaded(true);
        } else {
          throw new Error("no releases found");
        }
      }).catch(error => {
        setFetchError("Could not retrieve releases, " + error)
        setLoaded(true);
      })
  };

  useEffect(() => {
    if (!isLoaded) {
      fetchReleases();
    }
  });

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const handleBugzillaOpen = () => {
    setBugzillaOpen(true);
  }

  const handleBugzillaClose = () => {
    setBugzillaOpen(false);
  }

  function handleClick(id) {
    setOpen((prevState => ({ ...prevState, [id]: !prevState[id] })));
  };

  if (!isLoaded) {
    return (
      <Backdrop className={classes.backdrop} open={!isLoaded}>
        Fetching data...
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  const getLastUpdated = () => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    let millisAgo = lastUpdated.getTime() - Date.now()

    let minute = 1000 * 60; // Milliseconds in a minute
    let hour = 60 * minute; // Milliseconds in an hour

    if (Math.abs(millisAgo) < hour) {
      return (
        <Fragment>
          {rtf.format(Math.round(millisAgo / minute), "minutes")}
        </Fragment>
      );
    } else {
      return (
        <Fragment>
          {rtf.format(Math.round(millisAgo / hour), "hours")}
        </Fragment>
      );
    }
  }

  let landingPage = ""
  if (fetchError !== "") {
    landingPage = <Alert severity="error">{fetchError}</Alert>;
  } else if (releases.length > 0) {
    landingPage = <ReleaseOverview key={releases[0]} release={releases[0]} />
  } else {
    landingPage = "No data."
  }

  return (
    <MuiThemeProvider theme={createTheme(lightMode)}>
      <CssBaseline />
      <Router basename="/sippy-ng">
        <QueryParamProvider ReactRouterRoute={Route}>

          <div className={classes.root}>
            <AppBar
              position="fixed"
              className={clsx(classes.appBar, {
                [classes.appBarShift]: drawerOpen,
              })}
            >
              <Toolbar edge="start">
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  onClick={handleDrawerOpen}
                  edge="start"
                  className={clsx(classes.menuButton, drawerOpen && classes.hide)}
                >
                  <MenuIcon />
                </IconButton>
                <Grid container xs={12} justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" className={classes.title}>Sippy</Typography><Fragment>Last updated {getLastUpdated()}</Fragment>
                </Grid>
              </Toolbar>
            </AppBar>


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
                <IconButton onClick={handleDrawerClose}>
                  {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </IconButton>
              </div>
              <img className="App-logo" src={logo} alt="CIPI (Continuous Integration Private Investigator) aka Sippy." />
              <Divider />
              <List>
                <ListItem button component={Link} to="/" key="Home">
                  <ListItemIcon><HomeIcon /></ListItemIcon>
                  <ListItemText primary="Home" />
                </ListItem>
              </List>
              <Divider />
              <List
                subheader={
                  <ListSubheader component="div" id="releases">Releases</ListSubheader>
                }
              >
                {releases.map((release, index) => (
                  <Fragment>
                    <ListItem key={"release-" + index} button onClick={() => handleClick(index)}>
                      {open[index] ? <ExpandLess /> : <ExpandMore />}
                      <ListItemText primary={release} />
                    </ListItem>
                    <Collapse in={open[index]} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        <ListItem key={"release-overview-" + index} component={Link} to={"/release/" + release} button className={classes.nested}>
                          <ListItemIcon>
                            <InfoIcon />
                          </ListItemIcon>
                          <ListItemText primary="Overview" />
                        </ListItem>
                        <ListItem key={"release-jobs-" + index} component={Link} to={"/jobs/" + release} button className={classes.nested}>
                          <ListItemIcon>
                            <ListIcon />
                          </ListItemIcon>
                          <ListItemText primary="Jobs" />
                        </ListItem>
                        <ListItem key={"release-tests-" + index} component={Link} to={"/tests/" + release} button className={classes.nested}>
                          <ListItemIcon>
                            <SearchIcon />
                          </ListItemIcon>
                          <ListItemText primary="Tests" />
                        </ListItem>
                        <ListItem key={"release-upgrade-" + index} component={Link} to={"/upgrade/" + release} button className={classes.nested}>
                          <ListItemIcon>
                            <ArrowUpwardIcon />
                          </ListItemIcon>
                          <ListItemText primary="Upgrade" />
                        </ListItem>
                        <ListItem key={"release-install-" + index} component={Link} to={"/install/" + release} button className={classes.nested}>
                          <ListItemIcon>
                            <ExitToAppIcon />
                          </ListItemIcon>
                          <ListItemText primary="Install" />
                        </ListItem>

                        <ListItem key={"release-infrastructure-" + index} component={Link} to={"/tests/" + release + "/details?test=[sig-sippy] infrastructure should work"} button className={classes.nested}>
                          <ListItemIcon>
                            <ApartmentIcon />
                          </ListItemIcon>
                          <ListItemText primary="Infrastructure" />
                        </ListItem>

                      </List>
                    </Collapse>
                  </Fragment>
                ))}
              </List>
              <Divider />
              <List
                subheader={
                  <ListSubheader component="div" id="resources">Resources</ListSubheader>
                }

              >
                <ListItem button component="a" href="https://testgrid.k8s.io/redhat" target="_blank" key="TestGrid">
                  <ListItemIcon><AssessmentIcon /></ListItemIcon>
                  <ListItemText primary="TestGrid" />
                </ListItem>

                <ListItem button component="a" href="https://amd64.ocp.releases.ci.openshift.org/" target="_blank" key="ReleaseController">
                  <ListItemIcon><NewReleasesIcon /></ListItemIcon>
                  <ListItemText primary="Release Controller" />
                </ListItem>

                <ListItem button onClick={handleBugzillaOpen} key="SearchBugzilla">
                  <ListItemIcon><BugReport /></ListItemIcon>
                  <ListItemText primary="Search Bugzilla" />
                </ListItem>
                <BugzillaSearch open={handleBugzillaOpen} close={handleBugzillaClose} isOpen={bugzillaOpen} />

              </List>
            </Drawer>


            <main
              className={clsx(classes.content, {
                [classes.contentShift]: drawerOpen,
              })}
            >
              <div className={classes.drawerHeader} />

              <Switch>
                <Route path="/about">
                  <p>Hello, world!</p>
                </Route>

                <Route path="/release/:release" render={(props) =>
                  <ReleaseOverview
                    key={"release-overview-" + props.match.params.release}
                    release={props.match.params.release} />
                } />

                <Route path="/jobs/:release" render={(props) =>
                  <Jobs
                    key={"jobs-" + props.match.params.release}
                    title={"Job results for " + props.match.params.release}
                    release={props.match.params.release} />
                } />

                <Route path="/tests/:release/details" render={(props) =>
                  <TestDetailTable
                    key={props.match.params.release}
                    release={props.match.params.release} />
                } />

                <Route path="/tests/:release" render={(props) =>
                  <TestTable
                    key={"tests-" + props.match.params.release}
                    title={"Test results for " + props.match.params.release}
                    release={props.match.params.release} />
                } />

                <Route path="/upgrade/:release" render={(props) =>
                  <Upgrades
                    key={"upgrades-" + props.match.params.release}
                    release={props.match.params.release} />
                } />

                <Route path="/install/:release" render={(props) =>
                  <Install
                    key={"install-" + props.match.params.release}
                    release={props.match.params.release} />
                } />

                <Route path="/">
                  {landingPage}
                </Route>
              </Switch>
            </main>
          </div>
        </QueryParamProvider>
      </Router >
    </MuiThemeProvider>
  );
}
