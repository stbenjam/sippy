import './JobTable.css'
import { BOOKMARKS, JOB_THRESHOLDS } from '../constants'
import { BugReport, DirectionsRun, GridOn } from '@material-ui/icons'
import { Button, Container, Tooltip, Typography } from '@material-ui/core'
import { DataGrid } from '@material-ui/data-grid'
import {
  escapeRegex,
  pathForExactJobAnalysis,
  pathForExactJobRuns,
  safeEncodeURIComponent,
  SafeJSONParam,
} from '../helpers'
import { generateClasses } from '../datagrid/utils'
import { GridView } from '../datagrid/GridView'
import { Link } from 'react-router-dom'
import { StringParam, useQueryParam } from 'use-query-params'
import { withStyles } from '@material-ui/styles'
import Alert from '@material-ui/lab/Alert'
import BugzillaDialog from '../bugzilla/BugzillaDialog'
import GridToolbar from '../datagrid/GridToolbar'
import PassRateIcon from '../components/PassRateIcon'
import PropTypes from 'prop-types'
import React, { useEffect } from 'react'

const bookmarks = [
  { name: 'New jobs (no previous runs)', model: [BOOKMARKS.NEW_JOBS] },
  { name: 'Runs > 10', model: [BOOKMARKS.RUN_10] },
  { name: 'Upgrade related', model: [BOOKMARKS.UPGRADE] },
]

export const getColumns = (config, openBugzillaDialog) => {
  return {
    name: {
      field: 'name',
      headerName: 'Name',
      flex: 3.5,
      renderCell: (params) => {
        return (
          <div className="job-name">
            <Tooltip title={params.value}>
              <Link to={pathForExactJobAnalysis(config.release, params.value)}>
                {config.briefTable ? params.row.brief_name : params.value}
              </Link>
            </Tooltip>
          </div>
        )
      },
    },
    current_pass_percentage: {
      field: 'current_pass_percentage',
      headerName: 'Current pass percentage',
      type: 'number',
      flex: 0.75,
      renderCell: (params) => (
        <div className="percentage-cell">
          {Number(params.value).toFixed(1).toLocaleString()}%<br />
          <small>({params.row.current_runs} runs)</small>
        </div>
      ),
    },
    net_improvement: {
      field: 'net_improvement',
      headerName: 'Improvement',
      type: 'number',
      flex: 0.5,
      renderCell: (params) => {
        return <PassRateIcon tooltip={true} improvement={params.value} />
      },
    },
    previous_pass_percentage: {
      field: 'previous_pass_percentage',
      headerName: 'Previous pass percentage',
      flex: 0.75,
      type: 'number',
      renderCell: (params) => (
        <div className="percentage-cell">
          {Number(params.value).toFixed(1).toLocaleString()}%<br />
          <small>({params.row.previous_runs} runs)</small>
        </div>
      ),
    },
    test_grid_url: {
      field: 'test_grid_url',
      headerName: ' ',
      flex: 0.4,
      renderCell: (params) => {
        return (
          <Tooltip title="TestGrid">
            <Button
              style={{ justifyContent: 'center' }}
              target="_blank"
              startIcon={<GridOn />}
              href={params.value}
            />
          </Tooltip>
        )
      },
      filterable: false,
      hide: config.briefTable,
    },
    job_runs: {
      field: 'job_runs',
      headerName: ' ',
      flex: 0.4,
      renderCell: (params) => {
        return (
          <Tooltip title="See all job runs">
            <Button
              component={Link}
              style={{ justifyContent: 'center' }}
              startIcon={<DirectionsRun />}
              to={pathForExactJobRuns(config.release, params.row.name)}
            />
          </Tooltip>
        )
      },
      filterable: false,
      hide: config.briefTable,
    },
    link: {
      field: 'link',
      sortable: false,
      headerName: ' ',
      flex: 0.4,

      filterable: false,
      hide: config.briefTable,
      renderCell: (params) => {
        return (
          <Tooltip title="Find Bugs">
            <Button
              target="_blank"
              startIcon={<BugReport />}
              href={
                'https://search.ci.openshift.org/?search=' +
                safeEncodeURIComponent(escapeRegex(params.row.name)) +
                '&maxAge=336h&context=1&type=bug&name=&excludeName=&maxMatches=5&maxBytes=20971520&groupBy=job'
              }
            />
          </Tooltip>
        )
      },
    },
    average_runs_to_merge: {
      field: 'average_runs_to_merge',
      type: 'number',
      headerName: 'Average runs to merge',
      renderCell: (params) => Number(params.value).toFixed(1).toLocaleString(),
    },
    // These are here just to allow filtering
    org: {
      field: 'org',
      autocomplete: 'orgs',
      type: 'string',
      headerName: 'GitHub Org',
      hide: true,
    },
    repo: {
      field: 'repo',
      autocomplete: 'repos',
      type: 'string',
      headerName: 'GitHub Repo',
      hide: true,
    },
    variants: {
      field: 'variants',
      autocomplete: 'variants',
      type: 'array',
      headerName: 'Variants',
      hide: true,
    },
    current_runs: {
      field: 'current_runs',
      headerName: 'Current runs',
      hide: true,
      type: 'number',
    },
    previous_runs: {
      field: 'previous_runs',
      headerName: 'Previous runs',
      hide: true,
      type: 'number',
    },
  }
}

/**
 * JobTable shows the list of all jobs matching any selected filters,
 * including current and previous pass percentages, net improvement, and
 * bug links.
 */
function JobTable(props) {
  const { classes } = props

  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [rows, setRows] = React.useState([])
  const [selectedJobs, setSelectedJobs] = React.useState([])

  const [view = props.view, setView] = useQueryParam('view', StringParam)

  const [period = props.period, setPeriod] = useQueryParam(
    'period',
    StringParam
  )

  const [filterModel = props.filterModel, setFilterModel] = useQueryParam(
    'filters',
    SafeJSONParam
  )

  const [sortField = props.sortField, setSortField] = useQueryParam(
    'sortField',
    StringParam
  )
  const [sort = props.sort, setSort] = useQueryParam('sort', StringParam)

  const [isBugzillaDialogOpen, setBugzillaDialogOpen] = React.useState(false)
  const [jobDetails, setJobDetails] = React.useState({ bugs: [] })

  const openBugzillaDialog = (job) => {
    setJobDetails(job)
    setBugzillaDialogOpen(true)
  }

  const closeBugzillaDialog = (details) => {
    setBugzillaDialogOpen(false)
  }

  const fetchData = () => {
    let queryString = ''
    if (filterModel && filterModel.items.length > 0) {
      queryString +=
        '&filter=' + safeEncodeURIComponent(JSON.stringify(filterModel))
    }

    if (props.limit > 0) {
      queryString += '&limit=' + safeEncodeURIComponent(props.limit)
    }

    if (period) {
      queryString += '&period=' + safeEncodeURIComponent(period)
    }

    queryString += '&sortField=' + safeEncodeURIComponent(sortField)
    queryString += '&sort=' + safeEncodeURIComponent(sort)

    fetch(
      process.env.REACT_APP_API_URL +
        '/api/jobs?release=' +
        props.release +
        queryString
    )
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('server returned ' + response.status)
        }
        return response.json()
      })
      .then((json) => {
        setRows(json)
        setLoaded(true)
      })
      .catch((error) => {
        setFetchError('Could not retrieve jobs ' + props.release + ', ' + error)
      })
  }

  const requestSearch = (searchValue) => {
    const currentFilters = filterModel
    currentFilters.items = currentFilters.items.filter(
      (f) => f.columnField !== 'name'
    )
    currentFilters.items.push({
      id: 99,
      columnField: 'name',
      operatorValue: 'contains',
      value: searchValue,
    })
    setFilterModel(currentFilters)
  }

  useEffect(() => {
    fetchData()
  }, [period, filterModel, sort, sortField])

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
    return <p>Loading...</p>
  }

  const addFilters = (filter) => {
    const currentFilters = filterModel.items.filter((item) => item.value !== '')

    filter.forEach((item) => {
      if (item.value && item.value !== '') {
        currentFilters.push(item)
      }
    })
    setFilterModel({
      items: currentFilters,
      linkOperator: filterModel.linkOperator || 'and',
    })
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

  const selectedJobNames = () => {
    let jobs = rows
    if (selectedJobs.length !== 0) {
      const selectedIDs = new Set(selectedJobs)
      jobs = rows.filter((row) => selectedIDs.has(row.id))
    }
    return jobs.map((job) => job.name).join('\n')
  }

  const createFilter = () => {
    if (selectedJobs.length === rows.length || selectedJobs.length === 0) {
      return safeEncodeURIComponent(JSON.stringify(filterModel))
    }

    const selectedIDs = new Set(selectedJobs)
    let jobs = rows.filter((row) => selectedIDs.has(row.id))
    jobs = jobs.map((job, id) => {
      return {
        id: id,
        columnField: 'name',
        operatorValue: 'equals',
        value: job.name,
      }
    })
    return safeEncodeURIComponent(
      JSON.stringify({ items: jobs, linkOperator: 'or' })
    )
  }

  const detailsButton = (
    <Button
      component={Link}
      to={`/jobs/${props.release}/analysis?filters=${createFilter()}`}
      variant="contained"
      color="primary"
      style={{ margin: 10 }}
    >
      Analyze
    </Button>
  )

  const copyButton = (
    <Button
      onClick={() => navigator.clipboard.writeText(selectedJobNames())}
      variant="contained"
      color="secondary"
      style={{ margin: 10 }}
    >
      Copy names
    </Button>
  )

  const views = {
    Default: {
      sortField: 'current_pass_percentage',
      sort: 'asc',
      fieldOrder: [
        {
          field: 'name',
          flex: 3.5,
        },
        {
          field: 'current_pass_percentage',
          flex: 0.75,
          headerClassName: props.briefTable ? '' : 'wrapHeader',
        },
        {
          field: 'net_improvement',
          flex: 0.5,
        },
        {
          field: 'previous_pass_percentage',
          flex: 0.75,
          headerClassName: props.briefTable ? '' : 'wrapHeader',
        },
        {
          field: 'test_grid_url',
          flex: 0.4,
          hide: props.briefTable,
        },
        {
          field: 'job_runs',
          flex: 0.4,
          hide: props.briefTable,
        },
      ],
    },
    'Pull Requests': {
      sortField: 'average_runs_to_merge',
      sort: 'desc',
      fieldOrder: [
        {
          field: 'name',
          flex: 3.5,
        },
        {
          field: 'average_runs_to_merge',
          flex: 1,
          headerClassName: 'wrapHeader',
        },
      ],
    },
  }

  const gridView = new GridView(
    getColumns(props, openBugzillaDialog),
    views,
    view
  )

  const selectView = (v) => {
    setLoaded(false)
    setView(v)
    gridView.setView(v)
    setSort(gridView.view.sort)
    setSortField(gridView.view.sortField)
  }

  return (
    /* eslint-disable react/prop-types */
    <Container size="xl">
      {pageTitle()}
      <DataGrid
        components={{ Toolbar: props.hideControls ? '' : GridToolbar }}
        rows={rows}
        columns={gridView.columns}
        autoHeight={true}
        rowHeight={70}
        sortingOrder={['desc', 'asc']}
        sortModel={[
          {
            field: sortField,
            sort: sort,
          },
        ]}
        // Sorting:
        onSortModelChange={(m) => updateSortModel(m)}
        sortingMode="server"
        pageSize={props.pageSize}
        disableColumnFilter={props.briefTable}
        disableColumnMenu={true}
        checkboxSelection={!props.briefTable}
        onSelectionModelChange={(rows) => setSelectedJobs(rows)}
        rowsPerPageOptions={props.rowsPerPageOptions}
        getRowClassName={(params) =>
          classes[
            'row-percent-' + Math.round(params.row.current_pass_percentage)
          ]
        }
        componentsProps={{
          toolbar: {
            bookmarks: bookmarks,
            views: gridView.views,
            view: view,
            selectView: selectView,
            columns: gridView.filterColumns,
            clearSearch: () => requestSearch(''),
            doSearch: requestSearch,
            period: period,
            selectPeriod: setPeriod,
            addFilters: (m) => addFilters(m),
            filterModel: filterModel,
            setFilterModel: setFilterModel,
            downloadDataFunc: () => {
              return rows
            },
            downloadFilePrefix: 'jobs',
          },
        }}
      />
      {props.briefTable ? '' : detailsButton}
      {props.briefTable ? '' : copyButton}
      <BugzillaDialog
        release={props.release}
        item={jobDetails}
        isOpen={isBugzillaDialogOpen}
        close={closeBugzillaDialog}
      />
    </Container>
  )
}

JobTable.defaultProps = {
  hideControls: false,
  pageSize: 25,
  period: 'default',
  briefTable: false,
  rowsPerPageOptions: [5, 10, 25, 50, 100],
  filterModel: {
    items: [],
  },
  sortField: 'current_pass_percentage',
  sort: 'asc',
  view: 'Default',
}

JobTable.propTypes = {
  briefTable: PropTypes.bool,
  classes: PropTypes.object,
  limit: PropTypes.number,
  pageSize: PropTypes.number,
  release: PropTypes.string.isRequired,
  title: PropTypes.string,
  hideControls: PropTypes.bool,
  period: PropTypes.string,
  job: PropTypes.string,
  filterModel: PropTypes.object,
  sort: PropTypes.string,
  sortField: PropTypes.string,
  rowsPerPageOptions: PropTypes.array,
  view: PropTypes.string,
}

export default withStyles(generateClasses(JOB_THRESHOLDS))(JobTable)
