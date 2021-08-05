import { Tooltip, Typography } from '@material-ui/core';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import Switch from '@material-ui/core/Switch';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import { scale } from 'chroma-js';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import { BooleanParam, useQueryParam } from 'use-query-params';
import PassRateIcon from './PassRate/passRateIcon';


const useRowStyles = makeStyles({
    root: {
        '& > *': {
            borderColor: "black",
            borderStyle: "solid",
            color: 'black',
        },
    },
});

function PassRateCompare(props) {
    const { previous, current } = props;


    return (
        <Fragment>
            {current.toFixed(2)}%
            <PassRateIcon improvement={current - previous} />
            {previous.toFixed(2)}%
        </Fragment>
    );

}

function Cell(props) {
    const { result } = props;
    const theme = useTheme();

    let cellBackground = (percent) => {
        let colorScale = scale(
            [
                theme.palette.error.light,
                theme.palette.warning.light,
                theme.palette.success.light
            ]).domain(props.colorScale) 
        return(colorScale(percent).hex())
    }

    if (result === undefined) {
        return (
            <Tooltip title="No data">
                <TableCell style={{ textAlign: "center", backgroundColor: theme.palette.text.disabled }}>
                    <HelpOutlineIcon style={{ color: theme.palette.text.disabled }} />
                </TableCell>
            </Tooltip>
        );
    }

    if (props.showFull) {
        return (
            <TableCell width="8%" style={{ textAlign: "center", backgroundColor: cellBackground(result.current_pass_percentage) }}>
                <PassRateCompare current={result.current_pass_percentage} previous={result.previous_pass_percentage} />
            </TableCell>
        );
    } else {
        return (
            <Tooltip title={<PassRateCompare current={result.current_pass_percentage} previous={result.previous_pass_percentage} />}>
                <TableCell width="8%" style={{ textAlign: "center", backgroundColor: cellBackground(result.current_pass_percentage) }}>
                    <PassRateIcon improvement={result.current_pass_percentage - result.previous_pass_percentage} />
                </TableCell>
            </Tooltip>
        );
    }

}

function Row(props) {
    const { columnNames, testName, results } = props;
    const classes = useRowStyles();

    return (
        <Fragment>
            <TableRow className={classes.root}>
                <TableCell>{testName}</TableCell>
                {
                    columnNames.map((column) =>
                        <Cell colorScale={props.colorScale} showFull={props.showFull} result={results[column]}></Cell>
                    )}
            </TableRow>
        </Fragment>
    );
}

Row.propTypes = {
    row: PropTypes.shape({
        colorScale: PropTypes.array.isRequired,
        variant: PropTypes.string.isRequired,
        current: PropTypes.number.isRequired,
        previous: PropTypes.number.isRequired,
        jobs: PropTypes.arrayOf(
            PropTypes.shape({
                name: PropTypes.string.isRequired,
                bugLink: PropTypes.string.isRequired,
                current: PropTypes.number.isRequired,
                previous: PropTypes.number.isRequired,
            }),
        ).isRequired,
    }).isRequired,
};


export default function TestByVariantTable(props) {
    const [showFull, setShowFull] = useQueryParam("showFull", BooleanParam)

    if (props.data === undefined || props.data.tests.length === 0) {
        return <p>No data.</p>
    };

    let cellWidth = (70 / props.data.column_names.length) + "%";

    // Hack until I can figure out how to get React or the Material UI tables
    // to horizontally scroll in a nicer way
    let tableWidth = showFull ? 2500 : "100%";

    let handleSwitchFull = (e) => {
        setShowFull(e.target.checked)
    };

    const pageTitle = (
        <Typography variant="h4" style={{ margin: 20, textAlign: "center" }}>
            {props.title}
        </Typography>
    );

    if (props.data.tests && Object.keys(props.data.tests).length === 0) {
        return (
            <Fragment>
                {pageTitle}
                <p>No Results.</p>
            </Fragment>
        );
    }

    return (
        <Fragment>
            {pageTitle}
            <Table style={{ width: tableWidth, tableLayout: 'fixed' }}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{ width: "25%" }}>
                            <FormGroup row>
                                <FormControlLabel
                                    control={<Switch checked={showFull} onChange={handleSwitchFull} name="showFull" />}
                                    label="Show Full"
                                />
                            </FormGroup>
                        </TableCell>
                        {props.data.column_names.map((column) =>
                            <TableCell width={cellWidth}>{column}</TableCell>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {Object.keys(props.data.tests).map((test) => (
                        <Row colorScale={props.colorScale} showFull={showFull} key={test} testName={test} columnNames={props.data.column_names} results={props.data.tests[test]} release={props.release} />
                    ))}
                </TableBody>
            </Table>
        </Fragment>
    );
}

TestByVariantTable.defaultProps = {
    colorScale: [60,100]
}