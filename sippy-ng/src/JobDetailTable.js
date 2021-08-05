import { Paper, TableContainer } from '@material-ui/core';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import React, { Fragment } from 'react';
import './JobDashboard.css';

export default function JobDetailTable(props) {
    const columns = props.columns
    const rows = props.rows

    return (
        <Fragment>
            <br /><br />
            <div>
                <span className="legend-item"><span className="results results-demo"><span className="result result-S">S</span></span> success</span>
                <span className="legend-item"><span className="results results-demo"><span className="result result-F">F</span></span> failure (e2e)</span>
                <span className="legend-item"><span className="results results-demo"><span className="result result-f">f</span></span> failure (other tests)</span>
                <span className="legend-item"><span className="results results-demo"><span className="result result-U">U</span></span> upgrade failure</span>
                <span className="legend-item"><span className="results results-demo"><span className="result result-I">I</span></span> setup failure (installer)</span>
                <span className="legend-item"><span className="results results-demo"><span className="result result-N">N</span></span> setup failure (infra)</span>
                <span className="legend-item"><span className="results results-demo"><span className="result result-n">n</span></span> failure before setup (infra)</span>
                <span className="legend-item"><span className="results results-demo"><span className="result result-R">R</span></span> running</span>
            </div>

            <div class="view">
                <TableContainer component="div" className="wrapper">
                    <Table className="dashboard-table" aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell className="col-name col-first">Name</TableCell>
                                {columns.map((column) => (
                                    <TableCell className="col-day">{column}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) =>
                                <TableRow key={"job-" + row.name} className="row-item">
                                    <TableCell component="th" scope="row" className="col-name col-first">
                                        <a href={row.link}>{row.name}</a>
                                    </TableCell>
                                    {row.results.map((days) =>
                                        <TableCell className="col-day" key={"ts" + row.id}>
                                            <div className="results">
                                                {days.map((day) =>
                                                    <a key={day.id} className={day.className} href={day.prowLink} target="_blank">{day.text}</a>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </Fragment>
    );
}