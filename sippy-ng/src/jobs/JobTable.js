import './JobTable.css'
import { BOOKMARKS, JOB_THRESHOLDS } from '../constants'
import { bugColor, weightedBugComparator } from '../bugzilla/BugzillaUtils'
import { BugReport, DirectionsRun, GridOn } from '@material-ui/icons'
import { Button, Container, Tooltip, Typography } from '@material-ui/core'
import { DataGrid } from '@material-ui/data-grid'
import { generateClasses } from '../datagrid/utils'
import { JsonParam, StringParam, useQueryParam } from 'use-query-params'
import { Link } from 'react-router-dom'
import { pathForExactJobAnalysis, pathForExactJobRuns } from '../helpers'
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
  { name: 'Has a linked bug', model: [BOOKMARKS.LINKED_BUG] },
  { name: 'Has no linked bug', model: [BOOKMARKS.NO_LINKED_BUG] },
  { name: 'Has an associated bug', model: [BOOKMARKS.ASSOCIATED_BUG] },
  { name: 'Has no associated bug', model: [BOOKMARKS.NO_ASSOCIATED_BUG] },
]

export const getColumns = (config, openBugzillaDialog) => {
  return [
    {
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
    {
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
    {
      field: 'net_improvement',
      headerName: 'Improvement',
      type: 'number',
      flex: 0.5,
      renderCell: (params) => {
        return <PassRateIcon tooltip={true} improvement={params.value} />
      },
    },
    {
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
    {
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
    {
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
    {
      field: 'bugs',
      headerName: 'Bug count',
      flex: 0.4,
      type: 'number',
      filterable: true,
      renderCell: (params) => {
        return (
          <Tooltip
            title={
              params.value.length +
              ' linked bugs,' +
              params.row.associated_bugs.length +
              ' associated bugs'
            }
          >
            <Button
              style={{ justifyContent: 'center', color: bugColor(params.row) }}
              startIcon={<BugReport />}
              onClick={() => openBugzillaDialog(params.row)}
            />
          </Tooltip>
        )
      },
      // Weight linked bugs more than associated bugs, but associated bugs are ranked more than not having one at all.
      sortComparator: (v1, v2, param1, param2) =>
        weightedBugComparator(
          param1.api.getCellValue(param1.id, 'bugs'),
          param1.api.getCellValue(param1.id, 'associated_bugs'),
          param2.api.getCellValue(param2.id, 'bugs'),
          param2.api.getCellValue(param2.id, 'associated_bugs')
        ),
      hide: config.briefTable,
    },
    // These are here just to allow filtering
    {
      headerName: 'Test suites',
      field: 'test_suites',
      type: 'array',
      enums: {
        upgrade: 'Upgrade',
        parallel: 'Parallel',
        serial: 'Serial',
      },
      hide: true,
    },
    {
      headerName: 'IP Mode',
      field: 'ip_mode',
      type: 'string',
      enums: {
        ipv4: 'IPv4',
        ipv6: 'IPv6',
        dualstack: 'Dualstack',
      },
      hide: true,
    },
    {
      headerName: 'Network',
      field: 'network',
      type: 'string',
      enums: {
        ovn: 'OVNKubernetes',
        sdn: 'OpenshiftSDN',
      },
      hide: true,
    },
    {
      field: 'variants',
      type: 'array',
      headerName: 'Variants',
      hide: true,
    },
    {
      field: 'current_runs',
      headerName: 'Current runs',
      hide: true,
      type: 'number',
    },
    {
      field: 'previous_runs',
      headerName: 'Previous runs',
      hide: true,
      type: 'number',
    },
    {
      field: 'associated_bugs',
      headerName: 'Associated bugs',
      type: 'number',
      hide: true,
    },
    {
      field: 'tags',
      headerName: 'Tags',
      hide: true,
    },
  ]
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

  const [period = props.period, setPeriod] = useQueryParam(
    'period',
    StringParam
  )

  const [filterModel = props.filterModel, setFilterModel] = useQueryParam(
    'filters',
    JsonParam
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
        '&filter=' + encodeURIComponent(JSON.stringify(filterModel))
    }

    if (props.limit > 0) {
      queryString += '&limit=' + encodeURIComponent(props.limit)
    }

    if (period) {
      queryString += '&period=' + encodeURIComponent(period)
    }

    queryString += '&sortField=' + encodeURIComponent(sortField)
    queryString += '&sort=' + encodeURIComponent(sort)

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

  const createFilter = () => {
    if (selectedJobs.length === rows.length || selectedJobs.length === 0) {
      return encodeURIComponent(JSON.stringify(filterModel))
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
    console.log(jobs)
    return encodeURIComponent(
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

  const columns = getColumns(props, openBugzillaDialog)

  return (
    /* eslint-disable react/prop-types */
    <Container size="xl">
      {pageTitle()}
      <DataGrid
        components={{ Toolbar: props.hideControls ? '' : GridToolbar }}
        rows={rows}
        columns={columns}
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
        rowsPerPageOptions={[5, 10, 25, 50]}
        getRowClassName={(params) =>
          classes[
            'row-percent-' + Math.round(params.row.current_pass_percentage)
          ]
        }
        componentsProps={{
          toolbar: {
            bookmarks: bookmarks,
            clearSearch: () => requestSearch(''),
            doSearch: requestSearch,
            period: period,
            selectPeriod: setPeriod,
            filterModel: filterModel,
            setFilterModel: setFilterModel,
            columns: columns,
            addFilters: (m) => addFilters(m),
          },
        }}
      />
      {props.briefTable ? '' : detailsButton}
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
  briefTable: false,
  filterModel: {
    items: [],
  },
  sortField: 'current_pass_percentage',
  sort: 'asc',
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
}

export default withStyles(generateClasses(JOB_THRESHOLDS))(JobTable)
