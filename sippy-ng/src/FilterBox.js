import { Button, Grid, TextField, Tooltip } from '@material-ui/core';
import { Info } from '@material-ui/icons';
import { Alert } from '@material-ui/lab';
import React, { Fragment, useEffect } from 'react';
import { ArrayParam, useQueryParam, withDefault } from 'use-query-params';
import TestByVariantTable from './TestByVariantTable';

export default function FilterBox(props) {
    const [formError, setFormError] = React.useState(false)

    let submit = () => {
        if(props.value.length === 0 && props.required) {
            setFormError(true)
        } else {
            props.action()
        }
    }

    return (
        <Fragment>
            <Grid container xs={12} alignItems="stretch" style={{ display: "flex" }}>
                <TextField
                    id="outlined-secondary"
                    label="Filter"
                    variant="outlined"
                    color="secondary"
                    defaultValue={props.value}
                    style={{border: formError ? "solid 1px red" : "", width: "50%"}}
                    onChange={(e) => props.setValue(e.target.value)}
                /> &nbsp;&nbsp;

                <Button variant="contained" color="secondary" onClick={submit} >Search</Button>
            </Grid>
        </Fragment>
    );
}