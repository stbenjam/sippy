
import { Button, Container, Tooltip } from '@material-ui/core'
import IconButton from '@material-ui/core/IconButton'
import { createTheme } from '@material-ui/core/styles'
import TextField from '@material-ui/core/TextField'
import {
  DataGrid,
  GridToolbarDensitySelector,
  GridToolbarFilterButton
} from '@material-ui/data-grid'
import { BugReport, Search } from '@material-ui/icons'
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
import { BOOKMARKS, TEST_THRESHOLDS } from '../constants'
import GridToolbarBookmarkMenu from '../datagrid/GridToolbarBookmarkMenu'
import GridToolbarPeriodSelector from '../datagrid/GridToolbarPeriodSelector'

const bookmarks = [
  {
    name: 'Runs > 10',
    model: [BOOKMARKS.RUNS_10]
  },
  {
    name: 'Upgrade related',
    model: [BOOKMARKS.UPGRADE]
  },
  {
    name: 'Install related',
    model: [BOOKMARKS.INSTALL]
  },
  {
    name: 'Has a linked bug',
    model: [BOOKMARKS.LINKED_BUG]
  },
  {
    name: 'Has no linked bug',
    model: [BOOKMARKS.NO_LINKED_BUG]
  },
  {
    name: 'Has an associated bug',
    model: [BOOKMARKS.ASSOCIATED_BUG]
  },
  {
    name: 'Has no associated bug',
    model: [BOOKMARKS.NO_ASSOCIATED_BUG]
  },
  {
    name: 'Curated by TRT',
    model: [BOOKMARKS.TRT]
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

function TestSearchToolbar (props) {
  const classes = useStyles()

  return (
    <div className={classes.root}>
      <div>
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        <GridToolbarPeriodSelector
            selectPeriod={props.selectPeriod}
            period={props.period}
        />

        <GridToolbarBookmarkMenu bookmarks={bookmarks} setFilterModel={props.setFilterModel} />

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
          )
        }}
      />
    </div>
  )
}

TestSearchToolbar.propTypes = {
  selectPeriod: PropTypes.func.isRequired,
  period: PropTypes.string,
  clearSearch: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  setFilterModel: PropTypes.func
}

const styles = {
  good: {
    backgroundColor: defaultTheme.palette.success.light,
    color: defaultTheme.palette.success.contrastText
  },
  ok: {
    backgroundColor: defaultTheme.palette.warning.light,
    color: defaultTheme.palette.warning.contrastText
  },
  failing: {
    backgroundColor: defaultTheme.palette.error.light,
    color: defaultTheme.palette.warning.contrastText
  }
}

function TestTable (props) {
  const { classes } = props

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 3,
      renderCell: (params) => (
        <div style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Tooltip title={params.value}>
            <Link to={'/tests/' + props.release + '/details?test=' + params.row.name}>{params.value}</Link>
          </Tooltip>
        </div>
      )
    },
    {
      field: 'current_pass_percentage',
      headerName: 'Current Period',
      type: 'number',
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.row.current_runs + ' runs'}>
          <p>
            {Number(params.value).toFixed(2).toLocaleString()}%
          </p>
        </Tooltip>
      )
    },
    {
      field: 'net_improvement',
      headerName: 'Improvement',
      type: 'number',
      flex: 0.5,
      renderCell: (params) => {
        return <PassRateIcon tooltip={true} improvement={params.value} />
      }
    },
    {
      field: 'previous_pass_percentage',
      headerName: 'Previous Period',
      flex: 1,
      type: 'number',
      renderCell: (params) => (
        <Tooltip title={params.row.previous_runs + ' runs'}>
          <p>
            {Number(params.value).toFixed(2).toLocaleString()}%
          </p>
        </Tooltip>
      )
    },
    {
      field: 'link',
      headerName: ' ',
      flex: 0.40,
      filterable: false,
      renderCell: (params) => {
        return (
          <Button target="_blank" startIcon={<Search />} href={'https://search.ci.openshift.org/?search=' + encodeURIComponent(params.row.name) + '&maxAge=336h&context=1&type=bug%2Bjunit&name=&excludeName=&maxMatches=5&maxBytes=20971520&groupBy=job'} />
        )
      },
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

  const openBugzillaDialog = (test) => {
    setTestDetails(test)
    setBugzillaDialogOpen(true)
  }

  const closeBugzillaDialog = (details) => {
    setBugzillaDialogOpen(false)
  }

  const [isBugzillaDialogOpen, setBugzillaDialogOpen] = React.useState(false)
  const [testDetails, setTestDetails] = React.useState({ bugs: [] })

  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [tests, setTests] = React.useState([])
  const [rows, setRows] = React.useState([])
  const [selectedTests, setSelectedTests] = React.useState([])

  const [period = props.period, setPeriod] = useQueryParam('period', StringParam)

  const [searchText, setSearchText] = useQueryParam('searchText', StringParam)

  const [filterModel, setFilterModel] = React.useState(props.filterModel)
  const [filters = JSON.stringify(props.filterModel), setFilters] = useQueryParam('filters', StringParam)

  const [sortField = 'net_improvement', setSortField] = useQueryParam('sortField', StringParam)
  const [sort = 'asc', setSort] = useQueryParam('sort', StringParam)

  const fetchData = () => {
    let queryString = ''
    if (filters && filters !== '') {
      queryString += '&filter=' + encodeURIComponent(filters)
    }

    if (props.limit > 0) {
      queryString += '&limit=' + encodeURIComponent(props.limit)
    }

    if (period) {
      queryString += '&period=' + encodeURIComponent(period)
    }

    fetch(process.env.REACT_APP_API_URL + '/api/tests?release=' + props.release + queryString)
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('server returned ' + response.status)
        }
        return response.json()
      })
      .then(json => {
        setTests(json)
        setRows(json)
        setLoaded(true)
      }).catch(error => {
        setFetchError('Could not retrieve tests ' + props.release + ', ' + error)
      })
  }

  useEffect(() => {
    if (filters && filters !== '') {
      setFilterModel(JSON.parse(filters))
    }

    fetchData()
  }, [period, filters])

  const requestSearch = (searchValue) => {
    setSearchText(searchValue)
    const searchRegex = new RegExp(escapeRegExp(searchValue), 'i')
    const filteredRows = tests.filter((row) => {
      return Object.keys(row).some((field) => {
        return searchRegex.test(row[field].toString())
      })
    })
    setRows(filteredRows)
  }

  if (fetchError !== '') {
    return <Alert severity="error">{fetchError}</Alert>
  }

  if (isLoaded === false) {
    return <p>Loading...</p>
  }

  const createTestNameQuery = () => {
    const selectedIDs = new Set(selectedTests)
    let tests = rows.filter((row) =>
      selectedIDs.has(row.id)
    )
    tests = tests.map((test) =>
      'test=' + encodeURIComponent(test.name)
    )
    return tests.join('&')
  }

  const detailsButton = (
    <Button component={Link} to={'/tests/' + props.release + '/details?' + createTestNameQuery()} variant="contained" color="primary" style={{ margin: 10 }}>Get Details</Button>
  )

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
      <DataGrid
        components={{ Toolbar: props.hideControls ? '' : TestSearchToolbar }}
        rows={rows}
        columns={columns}
        autoHeight={true}
        disableColumnFilter={props.briefTable}
        disableColumnMenu={true}
        pageSize={props.pageSize}
        rowsPerPageOptions={[5, 10, 25, 50]}
        checkboxSelection={!props.hideControls}
        filterModel={filterModel}
        onFilterModelChange={(m) => setFilters(JSON.stringify(m))}
        sortingOrder={['desc', 'asc']}
        sortModel={[{
          field: sortField,
          sort: sort
        }]}
        onSortModelChange={(m) => updateSortModel(m)}
        onSelectionModelChange={(rows) =>
          setSelectedTests(rows)
        }
        getRowClassName={(params =>
          clsx({
            [classes.good]: (params.row.current_pass_percentage >= TEST_THRESHOLDS.success),
            [classes.ok]: (params.row.current_pass_percentage >= TEST_THRESHOLDS.warning && params.row.current_pass_percentage < TEST_THRESHOLDS.success),
            [classes.failing]: (params.row.current_pass_percentage >= TEST_THRESHOLDS.error && params.row.current_pass_percentage < TEST_THRESHOLDS.warning)
          })
        )}
        componentsProps={{
          toolbar: {
            value: searchText,
            onChange: (event) => requestSearch(event.target.value),
            clearSearch: () => requestSearch(''),
            period: period,
            selectPeriod: setPeriod,
            setFilterModel: (m) => addFilters(m)
          }
        }}
      />

      {props.hideControls ? '' : detailsButton}

      <BugzillaDialog item={testDetails} isOpen={isBugzillaDialogOpen} close={closeBugzillaDialog} />
    </Container>
  )
}

TestTable.defaultProps = {
  limit: 0,
  hideControls: false,
  pageSize: 25,
  briefTable: false,
  filterModel: {
    items: []
  }
}

TestTable.propTypes = {
  briefTable: PropTypes.bool,
  hideControls: PropTypes.bool,
  limit: PropTypes.number,
  pageSize: PropTypes.number,
  release: PropTypes.string.isRequired,
  classes: PropTypes.object,
  period: PropTypes.string,
  filterModel: PropTypes.object
}
export default withStyles(styles)(TestTable)
