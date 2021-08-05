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

export default function JobsDashboard(props) {
    const classes = useStyles();

    const [filter = null, setFilter] = useQueryParam("job", StringParam)
    const [query, setQuery] = React.useState("")
    const [jobs, setJobs] = React.useState([])
    const [isLoaded, setLoaded] = React.useState(false)
    const [pageRendered, setPageRendered] = React.useState(false)
    const [fetchError, setFetchError] = React.useState("")

    useEffect(() => {
        if (filter != null) {
            fetch(process.env.REACT_APP_API_URL + '/api/jobs/testgrid?release=' + props.release + "&job=" + encodeURIComponent(filter))
                .then((response) => {
                    if (response.status !== 200) {
                        throw new Error("server returned " + response.status);
                    }

                    return response.json();
                })
                .then(response => {
                    let jobs = response.jobs
                    jobs.sort((a, b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0);
                    setJobs(jobs)
                    console.log(jobs)
                    setLoaded(true)
                })
                .catch(error => {
                    setFetchError(error.toString())
                    setLoaded(true)
                })
        }
    }
        , [filter]
    )

    if (filter && !isLoaded) {
        return (
            <Backdrop className={classes.backdrop} open={!isLoaded}>
                Fetching live data...
                <CircularProgress color="inherit" />
            </Backdrop>
        );
    }

    if (fetchError != "") {
        return (
            <Alert severity="error">Failed to load data: {fetchError}</Alert>
        )
    }

    let filterSearch = (
        <Fragment>
            <Typography>Please enter a search query, or just click search. It will take a while, this fetches live data from Prow.</Typography>
            <Grid alignItems="stretch" style={{ display: "flex" }}>
                <TextField
                    id="outlined-secondary"
                    label="Filter"
                    variant="outlined"
                    color="secondary"
                    defaultValue={query}
                    onChange={(e) => setQuery(e.target.value)}
                />&nbsp;&nbsp;
                <Button variant="contained" color="secondary" onClick={() => setFilter(query)} >Search</Button>
            </Grid>
        </Fragment>
    )

    if (jobs.length == 0) {
        return filterSearch;
    }

    let filterRegexp = new RegExp(filter);

    let timestampBegin = 0;
    let timestampEnd = 0;
    for (let job of jobs) {
        if (filter && !filterRegexp.test(job.name)) {
            continue;
        }

        for (let ts of job.timestamps) {
            if (timestampBegin == 0 || ts < timestampBegin) {
                timestampBegin = ts;
            }
            if (timestampEnd == 0 || ts > timestampEnd) {
                timestampEnd = ts;
            }
        }
    }

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
    for (let job of jobs) {
        if (filter && !filterRegexp.test(job.name)) {
            continue;
        }

        let row = {
            name: job.name,
            link: job.testgrid_url,
            results: []
        }

        let ts = timestampEnd;
        let i = 0;
        while (ts >= timestampBegin) {
            let day = [];
            while (job.timestamps[i] >= ts) {
                let result = {}
                result.id = i;
                result.text = job.results[i]
                result.prowLink = 'https://prow.ci.openshift.org/view/gs/origin-ci-test/logs/' + job.name + '/' + job.build_ids[i];
                result.className = "result result-" + job.results[i]
                day.push(result)
                i++;
            }
            ts -= msPerDay;
            row.results.push(day)
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