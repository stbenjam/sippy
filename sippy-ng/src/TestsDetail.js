import { Backdrop, Button, CircularProgress, Grid, makeStyles, TextField, Tooltip } from '@material-ui/core';
import { Info, SettingsSystemDaydreamSharp } from '@material-ui/icons';
import { Alert } from '@material-ui/lab';
import React, { Fragment, useEffect } from 'react';
import { ArrayParam, useQueryParam, withDefault } from 'use-query-params';
import FilterBox from './FilterBox';
import TestByVariantTable from './TestByVariantTable';

const useStyles = makeStyles((theme) => ({
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
}));


export default function TestsDetails(props) {
    const classes = useStyles();

    const [names, setNames] = useQueryParam("test", withDefault(ArrayParam, []))
    const [query, setQuery] = React.useState("")

    const [fetchError, setFetchError] = React.useState("")
    const [isLoaded, setLoaded] = React.useState(false)
    const [data, setData] = React.useState({})

    let nameParams = () => {
        return names.map((param) => "&test=" + encodeURIComponent(param)).join("");
    }

    let fetchData = () => {
        fetch(process.env.REACT_APP_API_URL + '/api/tests/details?release=' + props.release + nameParams())
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error("server returned " + response.status);
                }
                return response.json();
            })
            .then(json => {
                setData(json)
                setQuery(names.join("|"))
                setLoaded(true)
            }).catch(error => {
                setFetchError("Could not retrieve release " + props.release + ", " + error);
            });
    }

    useEffect(() => {
        fetchData();
    }, [names]); // eslint-disable-line react-hooks/exhaustive-deps

    if (fetchError !== "") {
        return <Alert severity="error">Failed to load data, {fetchError}</Alert>;
    }

    let updateFilter = () => {
        let names = query.split(/(?<!\\)\|/)
        setLoaded(false)
        setNames(names)
    }

    const filterBox = (
        <Fragment>
            <FilterBox value={query} setValue={setQuery} action={updateFilter} required={true} />
        </Fragment>
    );

    if (!isLoaded) {
        return (
            <Fragment>
                <Backdrop className={classes.backdrop} open={!isLoaded}>
                    Fetching data...
                    <CircularProgress color="inherit" />
                </Backdrop>
                {filterBox}
            </Fragment>
        );
    }

    if (Object.keys(data.tests).length === 0) {
        return filterBox;
    }

    return (
        <Fragment>
            {filterBox}
            <TestByVariantTable release={props.release} data={data} />
        </Fragment>
    );
}