import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { Button, Grid, makeStyles, TableContainer, TextField, Typography } from '@material-ui/core';
import React, { Suspense, Fragment, useEffect } from 'react';
import { StringParam, useQueryParam } from 'use-query-params';
import { Backdrop, CircularProgress, Paper } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import './JobDashboard.css';
import JobDetailTable from './JobDetailTable';

const useStyles = makeStyles((theme) => ({
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
}));

export default function JobsDetail(props) {
    const classes = useStyles();

    const [trigger, setTrigger] = React.useState(false)
    const [filter, setFilter] = useQueryParam("job", StringParam)
    const [query, setQuery] = React.useState("")
    const [data, setData] = React.useState({ jobs: [] })
    const [isLoaded, setLoaded] = React.useState(false)
    const [fetchError, setFetchError] = React.useState("")

    useEffect(() => {
        setQuery(filter)


        if (trigger || filter !== "") {
            let urlQuery = ""
            if (filter) {
                urlQuery = "&filterBy=name&job=" + encodeURIComponent(filter)
            }

            fetch(process.env.REACT_APP_API_URL + '/api/jobs/details?release=' + props.release + urlQuery)
                .then((response) => {
                    if (response.status !== 200) {
                        throw new Error("server returned " + response.status);
                    }

                    return response.json();
                })
                .then(response => {
                    setData(response)
                    setLoaded(true)
                })
                .catch(error => {
                    setFetchError(error.toString())
                    setLoaded(true)

                })
        }

    }
        , [filter, trigger, query]
    )

    if (trigger && !isLoaded) {
        return (
            <Backdrop className={classes.backdrop} open={!isLoaded}>
                Fetching data...
                <CircularProgress color="inherit" />
            </Backdrop>
        );
    }

    if (fetchError != "") {
        return (
            <Alert severity="error">Failed to load data: {fetchError}</Alert>
        )
    }

    const updateFilter = (query) => {
        setLoaded(false)
        setTrigger(true)
        setFilter(query)
    }

    let filterSearch = (
        <Fragment>
            <Alert severity="warning">This page fetches a lot of data, it's better to search for the job you want. However, if you want to see it all, just click "search".</Alert><br />
            <Grid alignItems="stretch" style={{ display: "flex" }}>
                <TextField
                    id="outlined-secondary"
                    label="Filter"
                    variant="outlined"
                    color="secondary"
                    defaultValue={query}
                    onChange={(e) => setQuery(e.target.value)}
                />&nbsp;&nbsp;
                <Button variant="contained" color="secondary" onClick={() => updateFilter(query)} >Search</Button>
            </Grid>
        </Fragment>
    )

    if (data.jobs.length == 0) {
        return filterSearch;
    }

    let timestampBegin = data.start;
    let timestampEnd = data.end;

    const msPerDay = 86400 * 1000;
    timestampBegin = Math.floor(timestampBegin / msPerDay) * msPerDay;
    timestampEnd = Math.floor(timestampEnd / msPerDay) * msPerDay;

    let ts = timestampEnd;
    let columns = [];
    while (ts >= timestampBegin) {
        let d = new Date(ts);
        let value = (d.getUTCMonth() + 1) + '/' + d.getUTCDate();
        columns.push(value);
        ts -= msPerDay;
    }

    let rows = [];
    for (let job of data.jobs) {
        let row = {
            name: job.name,
            results: []
        }

        let ts = timestampEnd;
        let i = 0;
        while (ts >= timestampBegin) {
            let day = [];
            while (job.results[i] && job.results[i].timestamp >= ts) {
                let result = {}
                result.id = i;
                result.text = job.results[i].result
                result.prowLink = job.results[i].url
                result.className = "result result-" + result.text
                day.push(result)
                i++;
            }
            row.results.push(day)
            ts -= msPerDay;
        }
        rows.push(row)
    }

    return (
        <Fragment>
            {filterSearch}
            <JobDetailTable rows={rows} columns={columns} />
        </Fragment>
    );


}