import { Tooltip } from '@material-ui/core';
import { Info } from '@material-ui/icons';
import { Alert } from '@material-ui/lab';
import React, { Fragment, useEffect } from 'react';
import { ArrayParam, useQueryParam, withDefault } from 'use-query-params';
import TestByVariantTable from './TestByVariantTable';

export default function TestDetailTable(props) {
    const [names, setNames] = useQueryParam("test", withDefault(ArrayParam, []))

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

    let title = () => {
        return (
            <Fragment>
                Test details by variant for {props.release}&nbsp;
                <Tooltip title="Shows details for test passes by variant">
                    <Info/>
                </Tooltip>
            </Fragment>

        )
    }

    return (
        <TestByVariantTable title={title()} release={props.release} data={data} />
    );
}