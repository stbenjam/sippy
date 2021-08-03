import { Container, Grid, Paper, Tab, Tabs, Typography } from '@material-ui/core';
import { Alert, TabContext } from '@material-ui/lab';
import React, { useEffect } from 'react';
import {
    Link, Redirect, Route, Switch, useRouteMatch
} from "react-router-dom";
import JobTable from './JobTable';
import PassRateByVariant from './PassRate/passRateByVariant';
import VariantTable from './VariantTable';

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
                                <Tab label="By variant" value="variant" component={Link} to={url + "/variant"} />
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