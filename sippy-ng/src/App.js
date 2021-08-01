import React, { Fragment } from 'react';
import { createTheme, makeStyles, useTheme } from '@material-ui/core/styles';
import Collapse from '@material-ui/core/Collapse';
import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import clsx from 'clsx';
import AssessmentIcon from '@material-ui/icons/Assessment';
import ReleaseOverview from './ReleaseOverview';
import { FormGroup, FormControlLabel, ThemeProvider, CssBaseline, MuiThemeProvider } from '@material-ui/core';
import SentimentVeryDissatisfiedIcon from '@material-ui/icons/SentimentVeryDissatisfied';
import SupervisedUserCircleIcon from '@material-ui/icons/SupervisedUserCircle';
import { Switch as ControlSwitch } from '@material-ui/core';

import {
  HashRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import { Button, Container, ListSubheader } from '@material-ui/core';
import { BugReport, ExpandLess, ExpandMore, StarBorder } from '@material-ui/icons';

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
  },
};

const lightMode = {
  palette: {
    type: 'light',
  },
};

export default function App(props) {
  const classes = useStyles();
  const theme = useTheme();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [open, setOpen] = React.useState({});
  const [isThemeDark, setThemeDark] = React.useState(true);

  const handleDarkMode = (event) => {
    if (event.target.checked) {
      setThemeDark(true)
    } else {
      setThemeDark(false)
    }
  };

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  function handleClick(id) {
    setOpen((prevState => ({ ...prevState, [id]: !prevState[id] })));
  };

  return (
    <MuiThemeProvider theme={isThemeDark ? createTheme(darkMode) : createTheme(lightMode) }>
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
            <List
              subheader={
                <ListSubheader component="div" id="releases">Releases</ListSubheader>
              }
            >
              {['4.6', '4.7', '4.8', '4.9'].map((release, index) => (
                <Fragment>
                  <ListItem id={"release-" + index} button onClick={() => handleClick(index)}>
                    {open[index] ? <ExpandLess /> : <ExpandMore />}
                    <ListItemText primary={release} />
                  </ListItem>
                  <Collapse in={open[index]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      <ListItem button className={classes.nested}>
                        <ListItemIcon>
                          <SupervisedUserCircleIcon />
                        </ListItemIcon>
                        <ListItemText primary="Curated TRT Tests" />
                      </ListItem>
                      <ListItem button className={classes.nested}>
                        <ListItemIcon>
                          <SentimentVeryDissatisfiedIcon />
                        </ListItemIcon>
                        <ListItemText primary="Jobs by most reduced pass rate" />
                      </ListItem>
                      <ListItem button className={classes.nested}>
                        <ListItemIcon>
                          <BugReport />
                        </ListItemIcon>
                        <ListItemText primary="Failing tests without a bug" />
                      </ListItem>
                      <ListItem button className={classes.nested}>
                        <ListItemIcon>
                          <BugReport />
                        </ListItemIcon>
                        <ListItemText primary="Failing tests with a bug" />
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
              <Route path="/release/:id">
                <ReleaseOverview />
              </Route>
              <Route path="/">
                <ReleaseOverview release="4.9" />
              </Route>
            </Switch>
          </main>
        </div>
      </Router >
    </MuiThemeProvider>
  );
}
