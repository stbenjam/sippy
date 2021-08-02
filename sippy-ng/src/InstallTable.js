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

const useRowStyles = makeStyles({
    root: {
        '& > *': {
            borderBottom: 'unset',
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

function Cell(props) {
    const { result } = props;
    const theme = useTheme();

    let cellBackground = (improvement) => {
        if (improvement >= -2) {
            return theme.palette.success.light;
        } else if (improvement > -5) {
            return theme.palette.warning.light;
        } else {
            return theme.palette.error.light;
        }
    }

    if (result == undefined) {
        return <TableCell style={{backgroundColor: theme.palette.warning.light}}>No data</TableCell>
    }

    return (
        <TableCell style={{backgroundColor: cellBackground(result.net_improvement)}}>
            {result.current_pass_percentage.toFixed(2)}&nbsp;
            <PassRateIcon improvement={result.net_improvement} />
            {result.previous_pass_percentage.toFixed(2)}&nbsp;
        </TableCell>
    );
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
        <TableContainer component={Paper} style={{overflowX: 'auto', width: "2000px"}}>
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
    );
}