import { Button, Container, Tooltip, Typography } from '@material-ui/core'
import { CheckCircle, CompareArrows, Error, Help } from '@material-ui/icons'
import { createTheme, makeStyles } from '@material-ui/core/styles'
import { DataGrid } from '@material-ui/data-grid'
import { filterFor, relativeTime } from '../helpers'
import { JsonParam, StringParam, useQueryParam } from 'use-query-params'
import { Link, useHistory } from 'react-router-dom'
import Alert from '@material-ui/lab/Alert'
import GridToolbar from '../datagrid/GridToolbar'
import PropTypes from 'prop-types'
import React, { Fragment, useEffect } from 'react'

const defaultTheme = createTheme()
const useStyles = makeStyles(
  (theme) => ({
    releasePayloadOK: {
      backgroundColor: theme.palette.success.light,
    },
    releasePayloadProblem: {
      backgroundColor: theme.palette.error.light,
    },
  }),
  { defaultTheme }
)

function ReleasePayloadAcceptance(props) {
  const classes = useStyles()
  const history = useHistory()

  const columns = [
    {
      field: 'releaseTime',
      headerName: 'Date/Time',
      flex: 1.75,
      valueFormatter: (params) => {
        return new Date(params.value)
      },
      renderCell: (params) => {
        const when = new Date().getTime() - new Date(params.value).getTime()
        if (when > 24 * 60 * 60 * 1000) {
          return (
            <Tooltip title="Last accepted payload was too long ago.">
              <Fragment>
                <Error style={{ fill: 'maroon' }} />
                &nbsp;
                {relativeTime(new Date(params.value))}
              </Fragment>
            </Tooltip>
          )
        } else {
          return (
            <Tooltip title="This payload was accepted.">
              <Fragment>
                <CheckCircle style={{ fill: 'green' }} />
                &nbsp;
                {relativeTime(new Date(params.value))}
              </Fragment>
            </Tooltip>
          )
        }
      },
    },
    {
      field: 'architecture',
      headerName: 'Arch',
      flex: 1,
    },
    {
      field: 'stream',
      headerName: 'Stream',
      flex: 1,
    },
  ]

  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [rows, setRows] = React.useState([])

  const fetchData = () => {
    fetch(
      process.env.REACT_APP_API_URL +
        '/api/releases/health?release=' +
        encodeURIComponent(props.release)
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
        setFetchError('Could not retrieve tags ' + error)
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (fetchError !== '') {
    return <Alert severity="error">{fetchError}</Alert>
  }

  if (isLoaded === false) {
    return <p>Loading...</p>
  }

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      perPage={5}
      autoHeight={true}
      disableColumnFilter={true}
      disableColumnMenu={true}
      rowsPerPageOptions={props.rowsPerPageOptions}
      onRowClick={(params) => {
        let filter = {
          items: [
            filterFor('architecture', 'equals', params.row.architecture),
            filterFor('stream', 'equals', params.row.stream),
          ],
        }

        history.push(
          `/release/${props.release}/tags?filters=${encodeURIComponent(
            JSON.stringify(filter)
          )}`
        )
      }}
      getRowClassName={(params) => {
        const when =
          new Date().getTime() - new Date(params.row.releaseTime).getTime()
        if (when > 24 * 60 * 60 * 1000) {
          return classes['releasePayloadProblem']
        } else {
          return classes['releasePayloadOK']
        }
      }}
      filterMode="server"
      sortingMode="server"
    />
  )
}

ReleasePayloadAcceptance.defaultProps = {
  rowsPerPageOptions: [25, 50, 100],
}

ReleasePayloadAcceptance.propTypes = {
  release: PropTypes.string.isRequired,
  rowsPerPageOptions: PropTypes.array,
}

export default ReleasePayloadAcceptance
