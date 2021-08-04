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
import React, { Fragment, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrayParam, NumberParam, StringParam, useQueryParam } from 'use-query-params';
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


function FilterMenu(props) {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [selectedFilter, setSelectedFilter] = React.useState(props.initialFilter);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const selectFilter = (name) => {
        props.requestFilter(name);
        setSelectedFilter(name);
        handleClose();
    };

    return (
        <Fragment>
            <Button aria-controls="reports-menu" aria-haspopup="true" onClick={handleClick} startIcon={<Bookmark />} color="primary">Filters</Button>
            <Button color="secondary">
                {selectedFilter}
            </Button>
            <Menu
                id="reports-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >

                <MenuItem onClick={() => selectFilter("all")}>All tests</MenuItem>
                <MenuItem onClick={() => selectFilter("trt")}>Curated TRT tests</MenuItem>
                <MenuItem onClick={() => selectFilter("runs")}>More than 10 runs</MenuItem>
            </Menu>
        </Fragment>
    );
}

function TestSearchToolbar(props) {
    const classes = useStyles();

    return (
        <div className={classes.root}>
            <div>
                <GridToolbarFilterButton />
                <GridToolbarDensitySelector />
                <FilterMenu initialFilter={props.initialFilter} requestFilter={props.requestFilter} />
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


TestSearchToolbar.propTypes = {
    clearSearch: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.string.isRequired,
};


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


const columns = [
    {
        field: 'name',
        headerName: 'Name',
        flex: 5,
        renderCell: (params) => (
            <Tooltip title={params.value}>
                <p>{params.value}</p>
            </Tooltip>
        ),
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

function TestTable(props) {
    const { classes } = props;

    const [fetchError, setFetchError] = React.useState("")
    const [isLoaded, setLoaded] = React.useState(false)
    const [tests, setTests] = React.useState([])
    const [rows, setRows] = React.useState([])
    const [selectedTests, setSelectedTests] = React.useState([])

    const [runs = props.runs, setRuns] = useQueryParam("runs", NumberParam)
    const [filterBy = props.filterBy, setFilterBy] = useQueryParam("filterBy", StringParam)
    const [sortBy = props.sortBy, setSortBy] = useQueryParam("sortBy", StringParam)
    const [limit = props.limit, setLimit] = useQueryParam("limit, StringParam")

    const [searchText, setSearchText] = useQueryParam("searchText", StringParam)
    const [testNames = [], setTestNames] = useQueryParam("test", ArrayParam)

    const fetchData = () => {
        let queryString = ""
        if (filterBy && filterBy !== "") {
            queryString += "&filterBy=" + encodeURIComponent(filterBy)
        }

        testNames.forEach((test) =>
            queryString += "&test=" + encodeURIComponent(test)
        )

        if (filterBy === "runs" && runs) {
            queryString += "&runs=" + encodeURIComponent(runs)
        }

        if (sortBy && sortBy !== "") {
            queryString += "&sortBy=" + encodeURIComponent(sortBy)
        }

        if (limit) {
            queryString += "&limit=" + encodeURIComponent(limit)
        }

        fetch(process.env.REACT_APP_API_URL + '/api/tests?release=' + props.release + queryString)
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error("server returned " + response.status);
                }
                return response.json();
            })
            .then(json => {
                setTests(json)
                setRows(json)
                setLoaded(true)
            }).catch(error => {
                setFetchError("Could not retrieve tests " + props.release + ", " + error);
            });
    }

    useEffect(() => {
        fetchData()
    }, [filterBy])

    const requestSearch = (searchValue) => {
        setSearchText(searchValue)
        const searchRegex = new RegExp(escapeRegExp(searchValue), 'i');
        const filteredRows = tests.filter((row) => {
            return Object.keys(row).some((field) => {
                return searchRegex.test(row[field].toString());
            });
        });
        setRows(filteredRows)
    };

    if (fetchError !== "") {
        return <Alert severity="error">{fetchError}</Alert>;
    }

    if (isLoaded === false) {
        return "Loading..."
    }

    let title = ""
    if (props.title !== undefined) {
        title = <Typography variant="h4">{props.title}</Typography>
    }

    const createTestNameQuery = () => {
        const selectedIDs = new Set(selectedTests)
        let tests = rows.filter((row) =>
            selectedIDs.has(row.id)
        )
        tests = tests.map((test) =>
            "test=" + encodeURIComponent(test.name)
        )
        return tests.join("&")
    }

    const humanizedFilter = () => {
        switch (filterBy) {
            case "name":
                return "Filtered by name";
            case "trt":
                return "Filtered by curated TRT tests";
            case "runs":
                return "> " + runs + " runs";
        }
    }

    const detailsButton = (
        <Button component={Link} to={"/tests/" + props.release + "/details?" + createTestNameQuery()} variant="contained" color="primary" style={{ margin: 10 }}>Get Details</Button>
    );

    return (
        <Container size="xl">
            {title}
            <DataGrid
                components={{ Toolbar: (filterBy === "install" || filterBy == "upgrade" || props.hideControls) ? "" : TestSearchToolbar }}
                rows={rows}
                columns={columns}
                autoHeight={true}
                pageSize={props.pageSize}
                checkboxSelection={!props.hideControls}
                onSelectionModelChange={(rows) =>
                    setSelectedTests(rows)
                }
                getRowClassName={(params =>
                    clsx({
                        [classes.good]: (params.row.current_pass_percentage >= 80),
                        [classes.ok]: (params.row.current_pass_percentage >= 60 && params.row.current_pass_percentage < 80),
                        [classes.failing]: (params.row.current_pass_percentage < 60),
                    })
                )}
                componentsProps={{
                    toolbar: {
                        value: searchText,
                        onChange: (event) => requestSearch(event.target.value),
                        requestFilter: (report) => setFilterBy(report),
                        initialFilter: humanizedFilter(),
                        clearSearch: () => requestSearch(''),
                    },
                }}
            />

            {props.hideControls ? "" : detailsButton}

        </Container>
    );
}

TestTable.defaultProps = {
    hideControls: false,
    pageSize: 25,
}

export default withStyles(styles)(TestTable);