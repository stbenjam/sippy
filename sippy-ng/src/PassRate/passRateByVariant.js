import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import VariantTable from '../VariantTable';
import PassRateIcon from './passRateIcon';

const useRowStyles = makeStyles({
    root: {
        '& > *': {
            borderBottom: 'unset',
            color: 'black',
        },
    },
});

function Row(props) {
    const { row } = props;
    const [open, setOpen] = React.useState(false);
    const classes = useRowStyles();

    return (
        <Fragment>
            <TableRow className={classes.root} style={{backgroundColor: props.bgColor}}>
                <TableCell>
                    <IconButton style={{color: "black"}} aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">
                    {row.platform}
                </TableCell>
                <TableCell align="left">{row.passRates.latest.percentage.toFixed(2)}% ({row.passRates.latest.runs} runs)</TableCell>
                <TableCell align="center"><PassRateIcon improvement={row.passRates.latest.percentage - row.passRates.prev.percentage} /></TableCell>
                <TableCell align="left">{row.passRates.prev.percentage.toFixed(2)}% ({row.passRates.prev.runs} runs)</TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <VariantTable release={props.release} variant={row.platform} />
                    </Collapse>
                </TableCell>
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


export default function PassRateByVariant(props) {
    const theme = useTheme();

    let rowBackground = (percent) => {
        if (percent > 90) {
            return theme.palette.success.light;
        } else if (percent > 60) {
            return theme.palette.warning.light;
        } else {
            return theme.palette.error.light;
        }
    }

    return (
        <TableContainer component={Paper}>
            <Table aria-label="collapsible table">
                <TableHead>
                    <TableRow>
                        <TableCell />
                        <TableCell>Variant</TableCell>
                        <TableCell>Last 7 Days</TableCell>
                        <TableCell></TableCell>
                        <TableCell>Previous 7 Days</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {props.rows.map((row) => (
                        <Row key={row.platform} bgColor={rowBackground(row.passRates.latest.percentage)} row={row} release={props.release} />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}