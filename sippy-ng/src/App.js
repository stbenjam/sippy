import { CssBaseline, FormControlLabel, FormGroup, ListSubheader, MuiThemeProvider, Switch as ControlSwitch } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import Collapse from '@material-ui/core/Collapse';
import { yellow } from '@material-ui/core/colors';
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
import AssessmentIcon from '@material-ui/icons/Assessment';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import InfoIcon from '@material-ui/icons/Info';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import SupervisedUserCircleIcon from '@material-ui/icons/SupervisedUserCircle';
import Alert from '@material-ui/lab/Alert';
import clsx from 'clsx';
import React, { Fragment, useEffect } from 'react';
import {
  BrowserRouter as Router, Link, Route, Switch
} from "react-router-dom";
import Cookies from 'universal-cookie';
import BugzillaSearch from './BugzillaSearch';
import ReleaseOverview from './ReleaseOverview';
import TestTable from './TestTable';
import NewReleasesIcon from '@material-ui/icons/NewReleases';
import HomeIcon from '@material-ui/icons/Home';
import JobTable from './JobTable';
import InstallTable from './InstallTable';

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

const darkMode = {
  palette: {
    type: 'dark',
    secondary: yellow,
  },
};

const lightMode = {
  palette: {
    type: 'light',
  },
};

export default function App(props) {
  const cookies = new Cookies();
  const classes = useStyles();
  const theme = useTheme();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [isLoaded, setLoaded] = React.useState(false);
  const [isThemeDark, setThemeDark] = React.useState(false);
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
        setReleases(json.releases);
      }).catch(error => {
        setFetchError("Could not retrieve releases, " + error)
      })
  };

  useEffect(() => {
    if (!isLoaded) {
      fetchReleases();
      setLoaded(true);

      // Cookie to save user's theme preference
      let darkMode = cookies.get("darkMode")
      console.log(darkMode)

      if (darkMode === 'false' || darkMode == undefined) {
        setThemeDark(false)
      } else {
        setThemeDark(true)
      }
    }
  });

  const handleDarkMode = (event) => {
    if (event.target.checked) {
      cookies.set('darkMode', 'true', { path: '/' });
      setThemeDark(true)
    } else {
      cookies.set('darkMode', 'false', { path: '/' });
      setThemeDark(false)
    }
  };

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

  if (fetchError !== "") {
    return (
      <Alert severity="error">{fetchError}</Alert>
    )
  }

  return (
    <MuiThemeProvider theme={isThemeDark ? createTheme(darkMode) : createTheme(lightMode)}>
      <CssBaseline />
      <Router basename="/sippy-ng">
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
              <Typography variant="h6" className={classes.title}>Sippy</Typography>
              <FormGroup>
                <FormControlLabel
                  control={<ControlSwitch checked={isThemeDark} onChange={handleDarkMode} />}
                  label="Dark mode"
                />
              </FormGroup>
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
                          <SupervisedUserCircleIcon />
                        </ListItemIcon>
                        <ListItemText primary="Jobs" />
                      </ListItem>
                      <ListItem key={"release-tests-" + index} component={Link} to={"/tests/" + release} button className={classes.nested}>
                        <ListItemIcon>
                          <SearchIcon />
                        </ListItemIcon>
                        <ListItemText primary="Tests" />
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

              <Route path="/release/:release" render={(props) => <ReleaseOverview key={props.match.params.release} release={props.match.params.release} />} />
              <Route path="/jobs/:release" render={(props) => <JobTable key={props.match.params.release} release={props.match.params.release} />} />
              <Route path="/tests/:release" render={(props) => <TestTable key={props.match.params.release} release={props.match.params.release} />} />
              <Route path="/upgrade/:release" render={(props) => <InstallTable key={props.match.params.release} release={props.match.params.release} />} />
              <Route path="/">
                {releases.length > 0 ? <ReleaseOverview key={releases[0]} release={releases[0]} /> : "Loading..."}
              </Route>
            </Switch>
          </main>
        </div>
      </Router >
    </MuiThemeProvider>
  );
}
