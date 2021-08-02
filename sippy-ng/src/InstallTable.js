import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import { createTheme, makeStyles, useTheme } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import React, { Fragment, useEffect } from 'react';
import PassRateIcon from './PassRate/passRateIcon';
import { Tooltip, Typography } from '@material-ui/core';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';

const useRowStyles = makeStyles({
    root: {
        '& > *': {
            borderColor: "black",
            borderStyle: "solid",
            color: 'black',
        },
    },
});

const defaultTheme = createTheme();
const styles = {
    good: {
        backgroundColor: defaultTheme.palette.success.light,
        color: defaultTheme.palette.success.contrastText,
    },
    ok: {
        backgroundColor: defaultTheme.palette.warning.light,
        color: defaultTheme.palette.warning.contrastText,
    },
    failing: {
        backgroundColor: defaultTheme.palette.error.light,
        color: defaultTheme.palette.warning.contrastText,
    }
};

function PassRateCompare(props) {
    const { previous, current } = props;
    const theme = useTheme();


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

    let cellBackground = (current) => {
        if (current >= 92) {
            return theme.palette.success.light;
        } else if (current > 60) {
            return theme.palette.warning.light;
        } else {
            return theme.palette.error.light;
        }
    }

    if (result == undefined) {
        return (
            <Tooltip title="No data">
                <TableCell style={{ textAlign: "center", backgroundColor: theme.palette.warning.light }}>
                    <HelpOutlineIcon style={{color: theme.palette.text.disabled}}/>
                </TableCell>
            </Tooltip>
        );
    }

    return (
        <Tooltip title={<PassRateCompare current={result.current_pass_percentage} previous={result.previous_pass_percentage} />}>
            <TableCell width="8%" style={{ textAlign: "center", backgroundColor: cellBackground(result.current_pass_percentage) }}>
                <PassRateIcon improvement={result.current_pass_percentage - result.previous_pass_percentage} />
            </TableCell>
        </Tooltip>
    );
}

function Row(props) {
    const { columnNames, testName, results } = props;
    const classes = useRowStyles();

    return (
        <Fragment>
            <TableRow className={classes.root}>
                <TableCell width="30%">{testName}</TableCell>
                {
                    columnNames.map((column) =>
                        <Cell result={results[column]}></Cell>
                    )}
            </TableRow>
        </Fragment>
    );
}

Row.propTypes = {
    row: PropTypes.shape({
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


export default function InstallTable(props) {
    const theme = useTheme();

    const [fetchError, setFetchError] = React.useState("")
    const [isLoaded, setLoaded] = React.useState(false)
    const [data, setData] = React.useState({})

    let fetchData = () => {
        fetch(process.env.REACT_APP_API_URL + '/api/upgrade?release=' + props.release)
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

    let cardBackground = (percent) => {
        if (percent > 90) {
            return theme.palette.success.light;
        } else if (percent > 60) {
            return theme.palette.warning.light;
        } else {
            return theme.palette.error.light;
        }
    }

    useEffect(() => {
        if (!isLoaded) {
            fetchData();
        }
    }, []);


    if (!isLoaded) {
        return <p>Loading...</p>
    };

    return (
        <Fragment>
            <Typography variant="h4">
                Upgrade rates by operator for {props.release}
            </Typography>
            <TableContainer component={Paper} style={{ overflowX: 'auto' }}>
                <Table aria-label="collapsible table">
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            {data.column_names.map((column) =>
                                <TableCell>{column}</TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.keys(data.tests).map((test) => (
                            <Row key={test} testName={test} columnNames={data.column_names} results={data.tests[test]} release={props.release} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Fragment>
    );
}