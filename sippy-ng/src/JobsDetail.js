import { Backdrop, Button, CircularProgress, Grid, makeStyles, TextField } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import React, { Fragment, useEffect } from 'react';
import { StringParam, useQueryParam } from 'use-query-params';
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
    const [filter = null, setFilter] = useQueryParam("job", StringParam)
    const [query, setQuery] = React.useState("")
    const [data, setData] = React.useState({ jobs: [] })
    const [isLoaded, setLoaded] = React.useState(false)
    const [fetchError, setFetchError] = React.useState("")

    useEffect(() => {
        if (trigger || filter.length > 0) {
            let urlQuery = ""
            if (filter.length > 0) {
                setQuery(filter)
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
        , [filter, trigger]
    )

    if (trigger && !isLoaded) {
        return (
            <Backdrop className={classes.backdrop} open={!isLoaded}>
                Fetching data...
                <CircularProgress color="inherit" />
            </Backdrop>
        );
    }

    if (fetchError !== "") {
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
            <Alert severity="warning">Use an empty search for all results, but this returns a lot of data -- it's better to use a filter.</Alert><br />
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

    if (data.jobs.length === 0) {
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

    let rows = []
    for (let job of data.jobs) {
        let row = {
            name: job.name,
            results: []
        }

        for (let today = timestampBegin, tomorrow = timestampBegin + msPerDay;
            today <= timestampEnd;
            today += msPerDay, tomorrow += msPerDay) {
            let day = []

            for (let i = 0; i < job.results.length; i++) {
                if (job.results[i].timestamp >= today && job.results[i].timestamp < tomorrow) {
                    let result = {}
                    result.id = i;
                    result.text = job.results[i].result
                    result.prowLink = job.results[i].url
                    result.className = "result result-" + result.text
                    day.push(result)
                    i++
                }
            }

            row.results.unshift(day)
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