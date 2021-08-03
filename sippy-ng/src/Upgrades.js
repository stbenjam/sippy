import { Container, Grid, Paper, Tab, Tabs, Typography } from '@material-ui/core';
import { Alert, TabContext } from '@material-ui/lab';
import React, { useEffect } from 'react';
import {
    BrowserRouter as Router, Link, Redirect, Route, Switch, useRouteMatch
} from "react-router-dom";
import JobTable from './JobTable';
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

    if (fetchError !== "") {
        return <Alert severity="error">Failed to load data, {fetchError}</Alert>;
    }

    if (!isLoaded) {
        return <p>Loading...</p>
    };

    return (
        <Route
            path="/"
            render={({ location }) => (
                <TabContext value={path}>
                    <Typography align="center" variant="h4">
                        Upgrade health for {props.release}
                    </Typography>
                    <Grid container justifyContent="center" width="60%" style={{ margin: 20 }}>
                        <Paper>
                            <Tabs
                                value={location.pathname.substring(location.pathname.lastIndexOf('/') + 1)}
                                indicatorColor="primary"
                                textColor="primary"
                            >
                                <Tab label="Upgrade rates by operator" value="operators" component={Link} to={url + "/operators"} />
                                <Tab label="Upgrade related tests" value="tests" component={Link} to={url + "/tests"} />
                                <Tab label="Upgrade jobs" value="jobs" component={Link} to={url + "/jobs"} />
                            </Tabs>
                        </Paper>
                    </Grid>
                    <Switch>
                        <Route path={path + "/operators"}>
                            <TestByVariantTable colorScale={[90,100]} data={data} />
                        </Route>
                        <Route path={path + "/tests"}>
                            <TestTable release={props.release} filterBy="upgrade" />
                        </Route>
                        <Route path={path + "/jobs"}>
                            <Container size="xl">
                                <JobTable release={props.release} filterBy="upgrade" />
                            </Container>
                        </Route>
                        <Redirect from="/" to={url + "/operators"} />
                    </Switch>
                </TabContext>
            )}
        />
    );
}