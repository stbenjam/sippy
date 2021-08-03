import { Container, Grid, Paper, Tab, Tabs, Tooltip, Typography } from '@material-ui/core';
import { Alert, TabContext } from '@material-ui/lab';
import React, { Fragment, useEffect } from 'react';
import {
    Link, Redirect, Route, Switch, useRouteMatch
} from "react-router-dom";
import JobTable from './JobTable';
import PassRateByVariant, { TOOLTIP as VariantToolTip } from './PassRate/passRateByVariant';
import Info from '@material-ui/icons/Info';

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
                                <Tab label="All jobs" value="all" component={Link} to={url + "/all"} />
                                <Tooltip title={VariantToolTip}>
                                    <Tab label="Jobs by variant" value="variant" component={Link} to={url + "/variant"} />
                                </Tooltip>
                            </Tabs>
                        </Paper>
                    </Grid>
                    <Switch>
                        <Container size="xl">
                            <Route path={path + "/all"}>
                                <JobTable release={props.release} />
                            </Route>
                            <Route path={path + "/variant"}>
                                <PassRateByVariant release={props.release} />
                            </Route>
                            <Redirect from="/" to={url + "/all"} />
                        </Container>
                    </Switch>
                </TabContext>
            )}
        />
    );
}