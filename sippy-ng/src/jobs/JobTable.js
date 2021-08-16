import { Backdrop, Box, Button, CircularProgress, Container, Tooltip, Typography } from '@material-ui/core'
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
import SearchIcon from '@material-ui/icons/Search'
import Alert from '@material-ui/lab/Alert'
import { makeStyles, withStyles } from '@material-ui/styles'
import clsx from 'clsx'
import PropTypes from 'prop-types'
import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { StringParam, useQueryParam } from 'use-query-params'
import BugzillaDialog from '../bugzilla/BugzillaDialog'
import { bugColor, weightedBugComparator } from '../bugzilla/BugzillaUtils'
import PassRateIcon from '../components/PassRateIcon'
import { JOB_THRESHOLDS } from '../constants'
import GridToolbarBookmarkMenu from '../datagrid/GridToolbarBookmarkMenu'
import GridToolbarPeriodSelector from '../datagrid/GridToolbarPeriodSelector'

const bookmarks = [
  {
    name: 'Runs > 10',
    model: [
      { id: 1, columnField: 'current_runs', operatorValue: '>=', value: '10' }
    ]
  },
  {
    name: 'Upgrade related',
    model: [
      { id: 2, columnField: 'tags', operatorValue: 'contains', value: 'upgrade' }
    ]
  },
  {
    name: 'Has a linked bug',
    model: [
      { id: 3, columnField: 'bugs', operatorValue: '>', value: '0' }
    ]
  },
  {
    name: 'Has no linked bug',
    model: [
      { id: 4, columnField: 'bugs', operatorValue: '=', value: '0' }
    ]
  },
  {
    name: 'Has an associated bug',
    model: [
      { id: 5, columnField: 'associated_bugs', operatorValue: '>', value: '0' }
    ]
  },
  {
    name: 'Has no associated bug',
    model: [
      { id: 4, columnField: 'associated_bugs', operatorValue: '=', value: '0' }
    ]
  }
]

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
        <GridToolbarPeriodSelector selectPeriod={props.selectPeriod} period={props.period} />

        <GridToolbarBookmarkMenu bookmarks={bookmarks} setFilterModel={props.setFilterModel} />

      </div>
      <TextField
        variant="standard"
        value={props.value}
        onChange={props.onChange}
        placeholder="Search…"
        InputProps={{
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
  selectPeriod: PropTypes.func.isRequired,
  period: PropTypes.string,
  value: PropTypes.string,
  setFilterModel: PropTypes.func.isRequired
}

/**
 * JobTable shows the list of all jobs matching any selected filters,
 * including current and previous pass percentages, net improvement, and
 * bug links.
 */
function JobTable (props) {
  const { classes } = props
  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [jobs, setJobs] = React.useState([])
  const [rows, setRows] = React.useState([])

  const [searchText, setSearchText] = React.useState('')
  const [period = props.period, setPeriod] = useQueryParam('period', StringParam)

  const [filterModel, setFilterModel] = React.useState(props.filterModel)
  const [filters, setFilters] = useQueryParam('filters', StringParam)

  const [sortField = 'net_improvement', setSortField] = useQueryParam('sortField', StringParam)
  const [sort = 'asc', setSort] = useQueryParam('sort', StringParam)

  const [isBugzillaDialogOpen, setBugzillaDialogOpen] = React.useState(false)
  const [jobDetails, setJobDetails] = React.useState({ bugs: [] })

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 3,
      renderCell: (params) => {
        return (
          <div style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Tooltip title={params.value}>
              <Link to={'/jobs/' + props.release + '/detail?job=' + params.row.name}>
                {props.briefTable ? params.row.brief_name : params.value}
              </Link>
            </Tooltip>
          </div>
        )
      }
    },
    {
      field: 'current_pass_percentage',
      headerName: 'Current Period',
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
      headerName: 'Previous Period',
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
      filterable: false,
      hide: props.briefTable
    },
    {
      field: 'bugs',
      headerName: 'Bugs',
      flex: 0.40,
      type: 'number',
      filterable: true,
      renderCell: (params) => {
        return (
          <Tooltip title={params.value.length + ' linked bugs,' + params.row.associated_bugs.length + ' associated bugs'}>
            <Button style={{ justifyContent: 'center', color: bugColor(params.row) }} startIcon={<BugReport />} onClick={() => openBugzillaDialog(params.row)} />
          </Tooltip>
        )
      },
      // Weight linked bugs more than associated bugs, but associated bugs are ranked more than not having one at all.
      sortComparator: (v1, v2, param1, param2) => weightedBugComparator(
        param1.api.getCellValue(param1.id, 'bugs'),
        param1.api.getCellValue(param1.id, 'associated_bugs'),
        param2.api.getCellValue(param2.id, 'bugs'),
        param2.api.getCellValue(param2.id, 'associated_bugs')),
      hide: props.briefTable
    },
    // These are here just to allow filtering
    {
      field: 'variants',
      headerName: 'Variants',
      hide: true
    },
    {
      field: 'current_runs',
      headerName: 'Current runs',
      hide: true,
      type: 'number'
    },
    {
      field: 'previous_runs',
      headerName: 'Previous runs',
      hide: true,
      type: 'number'
    },
    {
      field: 'associated_bugs',
      headerName: 'Associated bugs',
      type: 'number',
      hide: true
    },
    {
      field: 'tags',
      headerName: 'Tags',
      hide: true
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
    if (filters && filters !== '') {
      queryString += '&filter=' + encodeURIComponent(filters)
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
    if (filters && filters !== '') {
      setFilterModel(JSON.parse(filters))
    }

    fetchData()
  }, [period, filters])

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

  const addFilters = (filter) => {
    const currentFilters = filterModel
    filter.forEach((item) => {
      currentFilters.items.push(item)
    })
    setFilters(JSON.stringify(currentFilters))
  }

  const updateSortModel = (model) => {
    if (model.length === 0) {
      return
    }

    if (sort !== model[0].sort) {
      setSort(model[0].sort)
    }

    if (sortField !== model[0].field) {
      setSortField(model[0].field)
    }
  }

  return (
    <Container size="xl">
      {pageTitle()}
      <DataGrid
        components={{ Toolbar: props.hideControls ? '' : JobSearchToolbar }}
        rows={rows}
        columns={columns}
        autoHeight={true}
        filterModel={filterModel}
        onFilterModelChange={(m) => setFilters(JSON.stringify(m))}
        sortingOrder={['desc', 'asc']}
        sortModel={[{
          field: sortField,
          sort: sort
        }]}
        onSortModelChange={(m) => updateSortModel(m)}
        pageSize={props.pageSize}
        disableColumnFilter={props.briefTable}
        disableColumnMenu={true}
        rowsPerPageOptions={[5, 10, 25, 50]}
        getRowClassName={(params =>
          clsx({
            [classes.good]: (params.row.current_pass_percentage >= JOB_THRESHOLDS.success),
            [classes.ok]: (params.row.current_pass_percentage >= JOB_THRESHOLDS.warning && params.row.current_pass_percentage < JOB_THRESHOLDS.success),
            [classes.failing]: (params.row.current_pass_percentage >= JOB_THRESHOLDS.error && params.row.current_pass_percentage < JOB_THRESHOLDS.warning)
          })
        )}
        componentsProps={{
          toolbar: {
            onChange: (event) => requestSearch(event.target.value),
            clearSearch: () => requestSearch(''),
            value: searchText,
            period: period,
            selectPeriod: setPeriod,
            setFilterModel: (m) => addFilters(m)
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
  briefTable: false,
  filterModel: {
    items: []
  }
}

JobTable.propTypes = {
  briefTable: PropTypes.bool,
  classes: PropTypes.object,
  limit: PropTypes.number,
  pageSize: PropTypes.number,
  release: PropTypes.string.isRequired,
  runs: PropTypes.number,
  sortBy: PropTypes.string,
  title: PropTypes.string,
  hideControls: PropTypes.bool,
  variant: PropTypes.string,
  period: PropTypes.string,
  job: PropTypes.string,
  filterModel: PropTypes.object
}

export default withStyles(styles)(JobTable)
