import { Backdrop, CircularProgress, Box, Button, Container, Tooltip, Typography } from '@material-ui/core'
import IconButton from '@material-ui/core/IconButton'
import { createTheme } from '@material-ui/core/styles'
import TextField from '@material-ui/core/TextField'
import {
  DataGrid,
  GridToolbarDensitySelector,
  GridToolbarFilterButton
} from '@material-ui/data-grid'
import { BugReport, GridOn } from '@material-ui/icons'
import ClearIcon from '@material-ui/icons/Clear'
import DirectionsRunIcon from '@material-ui/icons/DirectionsRun'
import SearchIcon from '@material-ui/icons/Search'
import Alert from '@material-ui/lab/Alert'
import { makeStyles, withStyles } from '@material-ui/styles'
import clsx from 'clsx'
import PropTypes from 'prop-types'
import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { NumberParam, StringParam, useQueryParam } from 'use-query-params'
import BugzillaDialog from './BugzillaDialog'
import PassRateIcon from './PassRate/passRateIcon'

function escapeRegExp (value) {
  return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
};

const defaultTheme = createTheme()
const useStyles = makeStyles(
  (theme) => ({
    root: {
      padding: theme.spacing(0.5, 0.5, 0),
      justifyContent: 'space-between',
      display: 'flex',
      alignItems: 'flex-start',
      flexWrap: 'wrap'
    },
    textField: {
      [theme.breakpoints.down('xs')]: {
        width: '100%'
      },
      margin: theme.spacing(1, 0.5, 1.5),
      '& .MuiSvgIcon-root': {
        marginRight: theme.spacing(0.5)
      },
      '& .MuiInput-underline:before': {
        borderBottom: `1px solid ${theme.palette.divider}`
      }
    }
  }),
  { defaultTheme }
)

const styles = {
  good: {
    backgroundColor: defaultTheme.palette.success.light,
    color: 'black'
  },
  ok: {
    backgroundColor: defaultTheme.palette.warning.light,
    color: 'black'
  },
  failing: {
    backgroundColor: defaultTheme.palette.error.light,
    color: 'black'
  }
}

function JobSearchToolbar (props) {
  const classes = useStyles()

  return (
        <div className={classes.root}>
            <div>
                <GridToolbarFilterButton />
                <GridToolbarDensitySelector />
            </div>
            <TextField
                variant="standard"
                value={props.value}
                onChange={props.onChange}
                placeholder="Search…"
                inputProps={{
                  startAdornment: <SearchIcon fontSize="small" />,
                  endAdornment: (
                        <IconButton
                            title="Clear"
                            aria-label="Clear"
                            size="small"
                            onClick={props.clearSearch}
                        >
                            <ClearIcon fontSize="small" />
                        </IconButton>
                  )
                }}
            />
        </div>
  )
}

JobSearchToolbar.propTypes = {
  clearSearch: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string
}

function JobTable (props) {
  const { classes } = props
  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [jobs, setJobs] = React.useState([])
  const [rows, setRows] = React.useState([])

  const [searchText, setSearchText] = React.useState('')
  const [filterBy = props.filterBy] = useQueryParam('filterBy', StringParam)
  const [sortBy = props.sortBy] = useQueryParam('sortBy', StringParam)
  const [limit = props.limit] = useQueryParam('limit', NumberParam)
  const [runs = props.runs] = useQueryParam('runs', NumberParam)

  const [job = ''] = useQueryParam('job', StringParam)

  const [isBugzillaDialogOpen, setBugzillaDialogOpen] = React.useState(false)
  const [jobDetails, setJobDetails] = React.useState({ bugs: [] })

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 3,
      renderCell: (params) => {
        return (
                    <Tooltip title={params.value}>
                        <Box>{props.briefTable ? params.row.brief_name : params.value}</Box>
                    </Tooltip>
        )
      }
    },
    {
      field: 'current_pass_percentage',
      headerName: 'Last 7 Days',
      type: 'number',
      flex: 1,
      renderCell: (params) => (
                <Tooltip title={params.row.current_runs + ' runs'}>
                    <Box>
                        {Number(params.value).toFixed(2).toLocaleString()}%
                    </Box>
                </Tooltip>
      )
    },
    {
      field: 'net_improvement',
      headerName: 'Improvement',
      type: 'number',
      flex: 0.5,
      renderCell: (params) => {
        return (
                    <PassRateIcon tooltip={true} improvement={params.value} />
        )
      }
    },
    {
      field: 'previous_pass_percentage',
      headerName: 'Previous 7 days',
      flex: 1,
      type: 'number',
      renderCell: (params) => (
                <Tooltip title={params.row.current_runs + ' runs'}>
                    <Box>
                        {Number(params.value).toFixed(2).toLocaleString()}%
                    </Box>
                </Tooltip>
      )
    },
    {
      field: 'test_grid_url',
      headerName: ' ',
      flex: 0.40,
      renderCell: (params) => {
        return (
                    <Tooltip title="TestGrid">
                        <Button style={{ justifyContent: 'center' }} target="_blank" startIcon={<GridOn />} href={params.value} />
                    </Tooltip>
        )
      },
      hide: props.briefTable
    },
    {
      field: '',
      headerName: ' ',
      flex: 0.40,
      renderCell: (params) => {
        return (
                    <Tooltip title="See detailed runs">
                        <Button style={{ justifyContent: 'center' }} startIcon={<DirectionsRunIcon />} component={Link} to={'/jobs/' + props.release + '/detail?job=' + params.row.name} />
                    </Tooltip>
        )
      },
      hide: props.briefTable
    },
    {
      field: 'bugs',
      headerName: ' ',
      flex: 0.40,
      renderCell: (params) => {
        return (
                    <Tooltip title={params.value.length + ' linked bugs,' + params.row.associated_bugs.length + ' associated bugs'}>
                        <Button style={{ justifyContent: 'center', color: params.value.length > 0 ? 'black' : 'silver' }} startIcon={<BugReport />} onClick={() => openBugzillaDialog(params.row)} />
                    </Tooltip>
        )
      },
      sortComparator: (v1, v2, param1, param2) =>
        param1.value.length - param2.value.length,
      hide: props.briefTable
    }
  ]

  const openBugzillaDialog = (job) => {
    setJobDetails(job)
    setBugzillaDialogOpen(true)
  }

  const closeBugzillaDialog = (details) => {
    setBugzillaDialogOpen(false)
  }

  const fetchData = () => {
    let queryString = ''
    if (filterBy && filterBy !== '') {
      queryString += '&filterBy=' + encodeURIComponent(filterBy)
    }

    if (sortBy && sortBy !== '') {
      queryString += '&sortBy=' + encodeURIComponent(sortBy)
    }

    if (limit && limit !== '') {
      queryString += '&limit=' + encodeURIComponent(limit)
    }

    if (job && job !== '') {
      queryString += '&job=' + encodeURIComponent(job)
    }

    if (runs) {
      queryString += '&runs=' + encodeURIComponent(runs)
    }

    fetch(process.env.REACT_APP_API_URL + '/api/jobs?release=' + props.release + queryString)
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('server returned ' + response.status)
        }
        return response.json()
      })
      .then(json => {
        setJobs(json)
        setRows(json)
        setLoaded(true)
      }).catch(error => {
        setFetchError('Could not retrieve jobs ' + props.release + ', ' + error)
      })
  }

  const requestSearch = (searchValue) => {
    setSearchText(searchValue)
    const searchRegex = new RegExp(escapeRegExp(searchValue), 'i')
    const filteredRows = jobs.filter((row) => {
      return Object.keys(row).some((field) => {
        return searchRegex.test(row[field].toString())
      })
    })
    setRows(filteredRows)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const pageTitle = () => {
    if (props.title) {
      return (
                <Typography align="center" style={{ margin: 20 }} variant="h4">
                    {props.title}
                </Typography>
      )
    }
  }

  if (fetchError !== '') {
    return <Alert severity="error">{fetchError}</Alert>
  }

  if (!isLoaded) {
    return (
            <Backdrop className={classes.backdrop} open={!isLoaded}>
                Fetching data...
                <CircularProgress color="inherit" />
            </Backdrop>
    )
  }

  if (jobs.length === 0) {
    return <p>No jobs.</p>
  }

  return (
        <Container size="xl">
            {pageTitle()}
            <DataGrid
                components={{ Toolbar: props.hideControls ? '' : JobSearchToolbar }}
                rows={rows}
                columns={columns}
                autoHeight={true}
                pageSize={props.pageSize}
                disableColumnFilter={props.briefTable}
                disableColumnMenu={true}
                getRowClassName={(params =>
                  clsx({
                    [classes.good]: (params.row.current_pass_percentage >= 80),
                    [classes.ok]: (params.row.current_pass_percentage >= 60 && params.row.current_pass_percentage < 80),
                    [classes.failing]: (params.row.current_pass_percentage < 60)
                  })
                )}
                componentsProps={{
                  toolbar: {
                    onChange: (event) => requestSearch(event.target.value),
                    clearSearch: () => requestSearch(''),
                    value: searchText
                  }
                }}

            />
            <BugzillaDialog item={jobDetails} isOpen={isBugzillaDialogOpen} close={closeBugzillaDialog} />
        </Container>
  )
}

JobTable.defaultProps = {
  hideControls: false,
  pageSize: 25,
  briefTable: false
}

JobTable.propTypes = {
  briefTable: PropTypes.bool,
  classes: PropTypes.object,
  filterBy: PropTypes.string,
  limit: PropTypes.number,
  pageSize: PropTypes.number,
  release: PropTypes.string.isRequired,
  runs: PropTypes.number,
  sortBy: PropTypes.string,
  title: PropTypes.string,
  hideControls: PropTypes.bool
}

export default withStyles(styles)(JobTable)
