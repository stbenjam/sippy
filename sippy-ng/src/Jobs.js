import { Container, Grid, Paper, Tab, Tabs, Typography } from '@material-ui/core';
import { TabContext } from '@material-ui/lab';
import React from 'react';
import {
    Link, Route, Switch, useRouteMatch
} from "react-router-dom";
import JobsDashboard from './JobsDashboard';
import JobTable from './JobTable';
import PassRateByVariant from './PassRate/passRateByVariant';

export default function Jobs(props) {
    let { path, url } = useRouteMatch();

    return (
        <Route
            path="/"
            render={({ location }) => (
                <TabContext value={path}>
                    <Typography align="center" variant="h4">
                        Job health for {props.release}
                    </Typography>
                    <Grid container justifyContent="center" width="60%" style={{ margin: 20 }}>
                        <Paper>
                            <Tabs
                                value={location.pathname.substring(location.pathname.lastIndexOf('/') + 1)}
                                indicatorColor="primary"
                                textColor="primary"
                            >
                                <Tab label="All jobs" value={props.release} component={Link} to={url} />
                                <Tab label="Jobs by variant" value="variant" component={Link} to={url + "/variant"} />
                                <Tab label="Dashboard" value="dashboard" component={Link} to={url + "/dashboard"} />
                            </Tabs>
                        </Paper>
                    </Grid>
                    <Container size="xl">
                        <Switch>
                            <Route path={path + "/variant"}>
                                <PassRateByVariant release={props.release} />
                            </Route>

                            <Route path={path + "/dashboard"}>
                                <JobsDashboard release={props.release} />
                            </Route>

                            <Route exact path={path}>
                                <JobTable release={props.release} />
                            </Route>
                        </Switch>
                    </Container>
                </TabContext>
            )}
        />
    );
}