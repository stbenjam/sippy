import { Grid, Paper, Tab, Tabs, Typography } from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import { Alert, TabContext } from '@material-ui/lab';
import React, { useEffect } from 'react';
import {
    BrowserRouter as Router, Link, Redirect, Route, Switch, useRouteMatch
} from "react-router-dom";
import TestByVariantTable from './TestByVariantTable';
import TestTable from './TestTable';

export default function Upgrades(props) {
    let { path, url } = useRouteMatch();
    
    const [fetchError, setFetchError] = React.useState("")
    const [isLoaded, setLoaded] = React.useState(false)
    const [data, setData] = React.useState({})

    let fetchData = () => {
        fetch(process.env.REACT_APP_API_URL + '/api/upgrade?release=' + props.release)
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error("server returned " + response.status);
                }
                return response.json();
            })
            .then(json => {
                setData(json)
                setLoaded(true)
            }).catch(error => {
                setFetchError("Could not retrieve release " + props.release + ", " + error);
            });
    }

    useEffect(() => {
        if (!isLoaded) {
            fetchData();
        }
    }, []);


    if (!isLoaded) {
        return <p>Loading...</p>
    };

    if (fetchError != "") {
        return <Alert severity="error">Failed to load data, {fetchError}</Alert>;
    }

    return (
        <Router>
            <Route
                path="/"
                render={({ location }) => (
                    <TabContext>
                        <Typography align="center" variant="h4">
                            Upgrade health for {props.release}
                        </Typography>
                        <Grid container justify="center" width="60%" style={{ justify: "center", margin: 20 }}>
                            <Paper>
                                <Tabs
                                    value={location.pathname.substring(location.pathname.lastIndexOf('/') + 1)}
                                    indicatorColor="primary"
                                    textColor="primary"
                                >
                                    <Tab label="Upgrade rates by operator" value="operators" component={Link} to={url + "/operators"}/>
                                    <Tab label="Upgrade related tests" value="tests" component={Link} to={url + "/tests"}/>
                                    <Tab label="Upgrade jobs" value="jobs" component={Link} to={url + "/jobs"}/>
                                </Tabs>
                            </Paper>
                        </Grid>
                        <Switch>
                            <Route path={path + "/operators"}>
                                <TestByVariantTable title={"Upgrade rates by operator for " + props.release} data={data} />
                            </Route>
                            <Route path={path + "/tests"}>
                                <TestTable release={props.release} filterBy="upgrade" />
                            </Route>
                            <Route path={path + "/jobs"}>
                                Jobs
                            </Route>
                            <Redirect from="/" to={url + "/operators"} />
                        </Switch>
                    </TabContext>
                )}
            />
        </Router>
    );
}