import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import React, { Component, Fragment } from 'react';

export default class BugzillaSearch extends Component {
    state = {
        open: this.props.open,
        query: "",
    };

    bugzillaDialogOpen = () => {
        this.setState({open: true});
    };

    bugzillaDialogClose = () => {
        this.setState({open: false});
    };

    bugzillaDialogQuery = (f) => {
        this.setState({query: f.target.value })
    };

    handleBugzillaQuery = (f) => {
        this.bugzillaDialogClose();
        alert(this.state.query);
    };

    render() {
        return (
            <Fragment>
                <Dialog open={this.bugzillaDialogOpen} onClose={this.bugzillaDialogClose} aria-labelledby="form-dialog-title">
                    <DialogTitle id="form-dialog-title">Search Bugzilla</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Search the OpenShift Bugzilla
                        </DialogContentText>
                        <TextField
                            autoFocus
                            margin="dense"
                            id="name"
                            label="Query"
                            type="text"
                            fullWidth
                            onChange={this.bugzillaDialogQuery}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.bugzillaDialogClose} color="primary">
                            Cancel
                        </Button>
                        <Button onClick={this.handleBugzillaQuery} color="primary">
                            Search
                        </Button>
                    </DialogActions>
                </Dialog>
            </Fragment>
        );
    }
}