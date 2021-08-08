import { Container, Grid, Paper, Tab, Tabs, Typography } from '@material-ui/core';
import { TabContext } from '@material-ui/lab';
import React from 'react';
import { Fragment } from 'react';
import {
    Link, Route, Switch, useRouteMatch
} from "react-router-dom";
import SimpleBreadcrumbs from './SimpleBreadcrumbs';
import TestTable from './TestTable';
import TestDetails from './TestsDetail';

export default function Tests(props) {
    let { path, url } = useRouteMatch();

    return (
        <Fragment>
            <SimpleBreadcrumbs release={props.release} currentPage="Tests" />

            <Route
                path="/"
                render={({ location }) => (
                    <TabContext value={path}>
                        <Typography align="center" variant="h4">
                            Tests for {props.release}
                        </Typography>
                        <Grid container justifyContent="center" width="60%" style={{ margin: 20 }}>
                            <Paper>
                                <Tabs
                                    value={location.pathname.substring(location.pathname.lastIndexOf('/') + 1)}
                                    indicatorColor="primary"
                                    textColor="primary"
                                >
                                    <Tab label="All tests" value={props.release} component={Link} to={url} />
                                    <Tab label="Tests by variant" value="details" component={Link} to={url + "/details"} />
                                </Tabs>
                            </Paper>
                        </Grid>
                        <Container size="xl">
                            <Switch>
                                <Route path={path + "/details"}>
                                    <TestDetails release={props.release} />
                                </Route>

                                <Route exact path={path}>
                                    <TestTable release={props.release} />
                                </Route>
                            </Switch>
                        </Container>
                    </TabContext>
                )}
            />
        </Fragment>
    );
}