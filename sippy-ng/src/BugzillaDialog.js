import { Button, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@material-ui/core';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { Close, Info } from '@material-ui/icons';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import bugzillaURL from './BugzillaUtils';

export default function BugzillaDialog(props) {
    const bugTable = (bugs) => {
        if(!bugs || bugs.length === 0) {
            return <Typography>None found</Typography>;
        }

        return (
            <TableContainer component={Paper} style={{ marginTop: 20 }}>
                <Table className={props.classes.table} size="small" aria-label="bug-table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Bug ID</TableCell>
                            <TableCell>Summary</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Component</TableCell>
                            <TableCell>Target Release</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bugs.map((bug) => (
                            <TableRow key={bug.id}>
                                <TableCell component="a" href={bug.url} scope="row">
                                    {bug.id}
                                </TableCell>

                                <TableCell>
                                    {bug.summary}
                                </TableCell>

                                <TableCell>
                                    {bug.status}
                                </TableCell>
                                <TableCell>
                                    {bug.component}
                                </TableCell>
                                <TableCell>
                                    {bug.target_release}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    return (
        <Fragment>
            <Dialog
                scroll="paper"
                style={{ verticalAlign: "top" }}
                maxWidth="md"
                fullWidth={true}
                open={props.isOpen}
                onClose={props.close}
                aria-labelledby="form-dialog-title">

                <DialogTitle id="form-dialog-title" style={{ textAlign: 'right' }}>
                    <Button startIcon={<Close />} onClick={props.close} />
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <Typography variant="h5">
                            {props.item.name}
                            <Divider />
                        </Typography>

                        <Typography variant="h6" style={{ margin: 20 }}>
                            Linked Bugs
                            <Tooltip title=" Linked bugs are bugs that mention the failing test name and are targeted to the release being reported on.">
                                <Info />
                            </Tooltip>
                        </Typography>

                        {bugTable(props.item.bugs)}

                        <Typography variant="h6" style={{ margin: 20 }}>
                            Associated Bugs
                            <Tooltip title="Associated bugs are bugs that mention the failing test name but are not targeted to the release being reported on.">
                                <Info />
                            </Tooltip>
                        </Typography>

                        {bugTable(props.item.associated_bugs)}


                        <Button target="_blank" href={bugzillaURL(props.item)} variant="contained" color="primary" style={{ marginTop: 20 }}>
                            Open a new bug
                        </Button>
                    </DialogContentText>
                </DialogContent>
            </Dialog>
        </Fragment >
    );
}

BugzillaDialog.defaultProps = {
    bugs: [],
    item: {
        name: "",
        bugs: [],
        associated_bugs: [],
    },
    classes: {},
}

BugzillaDialog.propTypes = {
    item: PropTypes.object,
    associatedBugs: PropTypes.array,
};
