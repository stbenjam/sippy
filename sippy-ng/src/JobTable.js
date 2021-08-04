import { Box, Button, Tooltip, Typography } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import { createTheme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import {
    DataGrid,
    GridToolbarDensitySelector,
    GridToolbarFilterButton
} from '@material-ui/data-grid';
import { Search } from '@material-ui/icons';
import ClearIcon from '@material-ui/icons/Clear';
import SearchIcon from '@material-ui/icons/Search';
import Alert from '@material-ui/lab/Alert';
import { makeStyles, withStyles } from '@material-ui/styles';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import React, { Fragment, useEffect } from 'react';
import { NumberParam, StringParam, useQueryParam } from 'use-query-params';
import PassRateIcon from './PassRate/passRateIcon';
import SortByMenu from './SortByMenu';

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
    {
        field: 'name',
        headerName: 'Name',
        flex: 5,
        renderCell: (params) => {
            return (
                <Tooltip title={params.value}>
                    <p>{params.value}</p>
                </Tooltip>
            );
        }
    },
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
            return (
                <PassRateIcon improvement={params.value} />
            );
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
                <SortByMenu setSort={props.setSort} />
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

function JobTable(props) {
    const { classes } = props;
    const [fetchError, setFetchError] = React.useState("")
    const [isLoaded, setLoaded] = React.useState(false)
    const [jobs, setJobs] = React.useState([])
    const [rows, setRows] = React.useState([])
    const [sortModel, setSortModel] = React.useState([{
        field: 'net_improvement',
        sort: 'asc',
    }])

    const [filterBy = props.filterBy, setFilterBy] = useQueryParam("filterBy", StringParam)
    const [sortBy = props.sortBy, sortSortBy] = useQueryParam("sortBy", StringParam)
    const [limit = props.limit, setLimit] = useQueryParam("limit", NumberParam)
    const [runs = props.runs] = useQueryParam("runs", NumberParam)

    const [job = "", setJob] = useQueryParam("job", StringParam)

    const fetchData = () => {
        let queryString = ""
        if (filterBy && filterBy != "") {
            queryString += "&filterBy=" + encodeURIComponent(filterBy)
        }

        if (sortBy && sortBy != "") {
            queryString += "&sortBy=" + encodeURIComponent(sortBy)
        }

        if (limit && limit != "") {
            queryString += "&limit=" + encodeURIComponent(limit)
        }


        if (job && job != "") {
            queryString += "&job=" + encodeURIComponent(job)
        }

        if (runs) {
            queryString += "&runs=" + encodeURIComponent(runs)
        }

        fetch(process.env.REACT_APP_API_URL + '/api/jobs2?release=' + props.release + queryString)
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error("server returned " + response.status);
                }
                return response.json();
            })
            .then(json => {
                setJobs(json)
                setRows(json)
                setLoaded(true)
            }).catch(error => {
                setFetchError("Could not retrieve jobs " + props.release + ", " + error);
            });
    };

    const requestSearch = (searchValue) => {
        this.setState({ searchText: searchValue });
        const searchRegex = new RegExp(escapeRegExp(searchValue), 'i');
        const filteredRows = jobs.filter((row) => {
            return Object.keys(row).some((field) => {
                return searchRegex.test(row[field].toString());
            });
        });
        setRows(filteredRows)
    };

    useEffect(() => {
        fetchData();
    }, [filterBy, job]);

    const pageTitle = () => {
        if (props.title) {
            return (
                <Typography align="center" style={{ margin: 20 }} variant="h4">
                    {props.title}
                </Typography>
            );
        }
    }

    if (fetchError !== "") {
        return <Alert severity="error">{fetchError}</Alert>;
    }

    if (isLoaded === false) {
        return "Loading..."
    }

    if (jobs.length === 0) {
        return <p>No jobs.</p>;
    }

    return (
        <Fragment>
            {pageTitle()}
            <DataGrid
                components={{ Toolbar: props.hideControls ? "" : JobSearchToolbar }}
                rows={rows}
                columns={columns}
                autoHeight={true}
                pageSize={props.pageSize}
                sortModel={sortModel}
                onSortModelChange={(model) => setSortModel(model)}
                getRowClassName={(params =>
                    clsx({
                        [classes.good]: (params.row.current_pass_percentage >= 80),
                        [classes.ok]: (params.row.current_pass_percentage >= 60 && params.row.current_pass_percentage < 80),
                        [classes.failing]: (params.row.current_pass_percentage < 60),
                    })
                )}
                componentsProps={{
                    toolbar: {
                        onChange: (event) => requestSearch(event.target.value),
                        clearSearch: () => requestSearch(''),
                        setSort: setSortModel,
                    },
                }}

            />
        </Fragment>
    );
}

JobTable.defaultProps = {
    hideControls: false,
    pageSize: 25,
}

export default withStyles(styles)(JobTable);