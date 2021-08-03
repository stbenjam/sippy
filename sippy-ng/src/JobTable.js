import { Box, Button, Container, Menu, MenuItem, Tooltip, Typography } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import { createTheme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import {
    DataGrid,
    GridToolbarDensitySelector,
    GridToolbarFilterButton
} from '@material-ui/data-grid';
import { Bookmark, Search } from '@material-ui/icons';
import ClearIcon from '@material-ui/icons/Clear';
import SearchIcon from '@material-ui/icons/Search';
import Alert from '@material-ui/lab/Alert';
import { makeStyles, withStyles } from '@material-ui/styles';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';
import PassRateIcon from './PassRate/passRateIcon';

function escapeRegExp(value) {
    return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

const defaultTheme = createTheme();
const useStyles = makeStyles(
    (theme) => ({
        root: {
            padding: theme.spacing(0.5, 0.5, 0),
            justifyContent: 'space-between',
            display: 'flex',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
        },
        textField: {
            [theme.breakpoints.down('xs')]: {
                width: '100%',
            },
            margin: theme.spacing(1, 0.5, 1.5),
            '& .MuiSvgIcon-root': {
                marginRight: theme.spacing(0.5),
            },
            '& .MuiInput-underline:before': {
                borderBottom: `1px solid ${theme.palette.divider}`,
            },
        },
    }),
    { defaultTheme },
);

const styles = {
    good: {
        backgroundColor: defaultTheme.palette.success.light,
        color: "black"
    },
    ok: {
        backgroundColor: defaultTheme.palette.warning.light,
        color: "black"
    },
    failing: {
        backgroundColor: defaultTheme.palette.error.light,
        color: "black"
    }
};


const columns = [
    { field: 'name', headerName: 'Name', flex: 5 },
    {
        field: 'current_pass_percentage',
        headerName: 'Last 7 Days',
        type: 'number',
        flex: 1,
        renderCell: (params) => (
            <Tooltip title={params.row.current_runs + " runs"}>
                <p>
                    {Number(params.value).toFixed(2).toLocaleString()}%
                </p>
            </Tooltip>
        ),
    },
    {
        field: 'net_improvement',
        headerName: 'Improvement',
        type: 'number',
        flex: 0.2,
        renderCell: (params) => {
            return <PassRateIcon improvement={params.value} />
        },
    },
    {
        field: 'previous_pass_percentage',
        headerName: 'Previous 7 days',
        flex: 1,
        type: 'number',
        renderCell: (params) => (
            <Tooltip title={params.row.current_runs + " runs"}>
                <p>
                    {Number(params.value).toFixed(2).toLocaleString()}%
                </p>
            </Tooltip>
        ),
    },
    {
        field: 'link',
        headerName: ' ',
        flex: 0.75,
        renderCell: (params) => {
            return (
                <Box>
                    <Button target="_blank" startIcon={<Search />} href={"https://search.ci.openshift.org/?search=" + encodeURIComponent(params.row.name) + "&maxAge=336h&context=1&type=bug%2Bjunit&name=&excludeName=&maxMatches=5&maxBytes=20971520&groupBy=job"} />
                </Box>
            );
        },
    },
];

function JobSearchToolbar(props) {
    const classes = useStyles();

    return (
        <div className={classes.root}>
            <div>
                <GridToolbarFilterButton />
                <GridToolbarDensitySelector />
                <ReportMenu requestReport={props.requestReport} />
            </div>
            <TextField
                variant="standard"
                value={props.value}
                onChange={props.onChange}
                placeholder="Search…"
                className={classes.textField}
                InputProps={{
                    startAdornment: <SearchIcon fontSize="small" />,
                    endAdornment: (
                        <IconButton
                            title="Clear"
                            aria-label="Clear"
                            size="small"
                            style={{ visibility: props.value ? 'visible' : 'hidden' }}
                            onClick={props.clearSearch}
                        >
                            <ClearIcon fontSize="small" />
                        </IconButton>
                    ),
                }}
            />
        </div>
    );
}

JobSearchToolbar.propTypes = {
    clearSearch: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.string.isRequired,
};

function ReportMenu(props) {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [selectedReport, setSelectedReport] = React.useState();

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const selectReport = (name) => {
        props.requestReport(name);
        setSelectedReport(name);
        handleClose();
    };

    return (
        <Fragment>
            <Button aria-controls="reports-menu" aria-haspopup="true" onClick={handleClick} startIcon={<Bookmark />} color="primary">Reports</Button>
            <Button color="secondary">
                {selectedReport}
            </Button>
            <Menu
                id="reports-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >

                <MenuItem onClick={() => selectReport("all")}>All jobs</MenuItem>
                <MenuItem onClick={() => selectReport("improved")}>Most improved pass rate</MenuItem>
                <MenuItem onClick={() => selectReport("reduced")}>Most reduced pass rate</MenuItem>
                <MenuItem onClick={() => selectReport("> 10 runs")}>More than 10 runs</MenuItem>
            </Menu>
        </Fragment>
    );
}

class JobTable extends Component {
    state = {
        fetchError: "",
        isLoaded: false,
        jobs: [],
        rows: [],
        searchText: "",
        currentReport: "",
    }

    fetchData = (props) => {
        fetch(process.env.REACT_APP_API_URL + '/api/jobs2?release=' + this.props.release)
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error("server returned " + response.status);
                }
                return response.json();
            })
            .then(json => {
                this.setState({
                    isLoaded: true,
                    jobs: json,
                    rows: json,
                })
            }).catch(error => {
                this.setState({ fetchError: "Could not retrieve jobs " + this.props.release + ", " + error });
            });
    }

    componentDidMount() {
        this.fetchData(this.props);
    }

    requestSearch = (searchValue) => {
        this.setState({ searchText: searchValue });
        const searchRegex = new RegExp(escapeRegExp(searchValue), 'i');
        const filteredRows = this.state.jobs.filter((row) => {
            return Object.keys(row).some((field) => {
                return searchRegex.test(row[field].toString());
            });
        });
        this.setState({ rows: filteredRows })
    };

    requestReport = (report) => {
        this.setState({ currentReport: report });
        let filteredRows = this.state.jobs.slice();

        switch (report) {
            case "all":
                break;
            case "> 10 runs":
                filteredRows = this.state.jobs.filter((row) => {
                    return row.current_runs > 10;
                });
                break;
            case "reduced":
                filteredRows.sort((first, second) => {
                    return first.net_improvement - second.net_improvement;
                })
                break;
            case "improved":
                filteredRows.sort((first, second) => {
                    return second.net_improvement - first.net_improvement;
                })
                break;
            default:
                break;
        }
        this.setState({ rows: filteredRows })
    };

    pageTitle = () => {
        if (this.props.title) {
            return (
                <Typography align="center" style={{margin: 20 }} variant="h4">
                   {this.props.title} 
                </Typography>
            );
        }
    }

    render() {
        const { classes } = this.props;

        if (this.state.fetchError !== "") {
            return <Alert severity="error">{this.state.fetchError}</Alert>;
        }

        if (this.state.isLoaded === false) {
            return "Loading..."
        }

        if (this.state.jobs.length === 0) {
            return <p>No jobs.</p>;
        }

        return (
            <Fragment>
                {this.pageTitle()}
                <DataGrid
                    components={{ Toolbar: JobSearchToolbar }}
                    rows={this.state.rows}
                    columns={columns}
                    autoHeight={true}
                    pageSize={25}
                    getRowClassName={(params =>
                        clsx({
                            [classes.good]: (params.row.current_pass_percentage >= 80),
                            [classes.ok]: (params.row.current_pass_percentage >= 60 && params.row.current_pass_percentage < 80),
                            [classes.failing]: (params.row.current_pass_percentage < 60),
                        })
                    )}
                    componentsProps={{
                        toolbar: {
                            value: this.state.searchText,
                            onChange: (event) => this.requestSearch(event.target.value),
                            requestReport: (report) => this.requestReport(report),
                            clearSearch: () => this.requestSearch(''),
                        },
                    }}

                />
            </Fragment>
        );
    }
}

export default withStyles(styles, { withTheme: true })(JobTable);