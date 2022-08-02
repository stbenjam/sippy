import {
  ArrayParam,
  JsonParam,
  StringParam,
  useQueryParam,
} from 'use-query-params'
import { BUILD_CLUSTER_THRESHOLDS, JOB_THRESHOLDS } from '../constants'
import { CircularProgress } from '@material-ui/core'
import { DataGrid } from '@material-ui/data-grid'
import { generateClasses } from '../datagrid/utils'
import { safeEncodeURIComponent } from '../helpers'
import { withStyles } from '@material-ui/styles'
import Alert from '@material-ui/lab/Alert'
import PassRateIcon from '../components/PassRateIcon'
import PropTypes from 'prop-types'
import React, { Fragment, useEffect } from 'react'

function BuildClusterTable(props) {
  const { classes } = props

  // place to store state (i.e., our table data, error message, etc)
  const [rows, setRows] = React.useState([])
  const [error, setError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)

  const [period = props.period, setPeriod] = useQueryParam(
    'period',
    StringParam
  )

  // define table columns
  const columns = [
    {
      field: 'cluster',
      headerName: 'Cluster',
      flex: 1,
    },
    {
      field: 'current_pass_percentage',
      headerName: 'Current pass percentage',
      renderCell: (params) => {
        return Number(params.value).toFixed(2) + '%'
      },
      flex: 1,
    },
    {
      field: 'net_improvement',
      headerName: 'Net improvement',
      flex: 1,
      renderCell: (params) => {
        return <PassRateIcon tooltip={true} improvement={params.value} />
      },
    },
    {
      field: 'previous_pass_percentage',
      headerName: 'Previous pass percentage',
      renderCell: (params) => {
        return Number(params.value).toFixed(2) + '%'
      },
      flex: 1,
    },
  ]

  // fetch data from api
  const fetchData = () => {
    let queryString = ''
    if (period) {
      queryString += '?period=' + safeEncodeURIComponent(period)
    }

    fetch(
      process.env.REACT_APP_API_URL + '/api/health/build_cluster' + queryString
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
        setError('Could not retrieve build cluster health: ' + error)
      })
  }

  useEffect(() => {
    fetchData()
  }, [period])

  if (error !== '') {
    return <Alert severity="error">{error}</Alert>
  }

  // loading message
  if (!isLoaded) {
    console.log(period)
    return <CircularProgress color="secondary" />
  }

  // what we return
  return (
    <DataGrid
      autoHeight={true}
      columns={columns}
      rows={rows}
      getRowClassName={(params) =>
        classes['row-percent-' + Math.round(params.row.current_pass_percentage)]
      }
    />
  )
}

export default withStyles(generateClasses(BUILD_CLUSTER_THRESHOLDS))(
  BuildClusterTable
)

BuildClusterTable.defaultProps = {
  period: 'default',
}

BuildClusterTable.propTypes = {
  briefTable: PropTypes.bool,
  classes: PropTypes.object,
  period: PropTypes.string,
}
