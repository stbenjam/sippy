import './JobTable.css'
import { Container, Link } from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import { generateClasses } from '../datagrid/utils'
import { JOB_THRESHOLDS, VARIANT_THRESHOLDS } from '../constants'
import { makeStyles, styled, withStyles } from '@mui/styles'
import { pathForVariantAnalysis } from '../helpers'
import { PropTypes } from 'prop-types'
import Alert from '@mui/material/Alert'
import PassRateIcon from '../components/PassRateIcon'
import React, { Fragment, useEffect } from 'react'

const useStyles = makeStyles((theme) => ({
  root: {
    '& .wrapHeader .MuiDataGrid-columnHeaderTitle': {
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      '-webkit-line-clamp': 2,
      '-webkit-box-orient': 'vertical',
      overflow: 'hidden',
      overflowWrap: 'break-word',
      lineHeight: '20px',
      whiteSpace: 'normal',
    },
    backdrop: {
      zIndex: 999999,
      color: '#fff',
    },
  },
}))

const SimpleLink = styled(Link)({
  textDecoration: 'none',
  color: 'inherit',
})

function VariantCards(props) {
  const { classes } = props
  const gridClasses = useStyles()

  const [variants, setVariants] = React.useState([])
  const [isLoaded, setLoaded] = React.useState(false)
  const [fetchError, setFetchError] = React.useState('')

  const fetchData = () => {
    fetch(
      process.env.REACT_APP_API_URL + '/api/variants?release=' + props.release
    )
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('server returned ' + response.status)
        }
        return response.json()
      })
      .then((json) => {
        setVariants(json)
        setLoaded(true)
      })
      .catch((error) => {
        setFetchError(
          'Could not retrieve release ' + props.release + ', ' + error
        )
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (fetchError !== '') {
    return <Alert severity="error">{fetchError}</Alert>
  }

  if (!isLoaded) {
    return <p>Loading...</p>
  }

  const columns = [
    {
      field: 'name',
      headerName: 'Variant',
      flex: 2,
      renderCell: (params) => {
        return (
          <SimpleLink to={pathForVariantAnalysis(props.release, params.value)}>
            {params.value}
          </SimpleLink>
        )
      },
    },
    {
      headerName: 'Current runs',
      field: 'current_runs',
      type: 'number',
      hide: true,
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
  ]

  const rows = variants.map((variant, index) => ({
    id: index,
    name: variant.name,
    current_runs: variant.current_runs,
    current_pass_percentage: variant.current_pass_percentage,
    previous_runs: variant.previous_runs,
    previous_pass_percentage: variant.previous_pass_percentage,
    net_improvement: variant.net_improvement,
  }))

  return (
    <Container>
      <div style={{ height: '100%', width: '100%', marginTop: 25 }}>
        <DataGrid
          disableSelectionOnClick
          className={gridClasses.root}
          components={{ Toolbar: GridToolbar }}
          checkboxSelection={false}
          autoHeight={true}
          initialState={{
            filter: {
              filterModel: {
                items: [
                  {
                    columnField: 'current_runs',
                    operatorValue: '>=',
                    value: '7',
                  },
                ],
              },
            },
            sorting: {
              sortModel: [{ field: 'current_pass_percentage', sort: 'asc' }],
            },
          }}
          rowHeight={70}
          rows={rows}
          columns={columns}
          pageSize={7}
          rowsPerPageOptions={[7, 15, 25]}
          getRowClassName={(params) => {
            let c =
              'row-percent-' + Math.round(params.row.current_pass_percentage)
            return classes[c]
          }}
        />
      </div>
    </Container>
  )
}

export default withStyles(generateClasses(JOB_THRESHOLDS))(VariantCards)

VariantCards.propTypes = {
  classes: PropTypes.object,
  release: PropTypes.string.isRequired,
}
