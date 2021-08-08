import PropTypes from 'prop-types'
import { Box, Button, Container, createTheme, Tooltip } from '@material-ui/core'
import {
  DataGrid
} from '@material-ui/data-grid'
import { Search } from '@material-ui/icons'
import Alert from '@material-ui/lab/Alert'
import { withStyles } from '@material-ui/styles'
import clsx from 'clsx'
import React, { Component } from 'react'
import PassRateIcon from './PassRate/passRateIcon'
import QuickSearchToolbar from './QuickSearchToolbar'

function escapeRegExp (value) {
  return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
};

const defaultTheme = createTheme()
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

const columns = [
  { field: 'name', headerName: 'Name', flex: 5 },
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
    flex: 0.2,
    renderCell: (params) => {
      return <PassRateIcon improvement={params.value} />
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
    field: 'link',
    headerName: ' ',
    flex: 0.75,
    renderCell: (params) => {
      return (
        <Box>
          <Button target="_blank" startIcon={<Search />} href={'https://search.ci.openshift.org/?search=' + encodeURIComponent(params.row.name) + '&maxAge=336h&context=1&type=bug%2Bjunit&name=&excludeName=&maxMatches=5&maxBytes=20971520&groupBy=job'} />
        </Box>
      )
    }
  }
]

class VariantTable extends Component {
  constructor (props) {
    super(props)
    this.setState({
      fetchError: '',
      isLoaded: false,
      variants: [],
      rows: [],
      searchText: '',
      currentReport: ''
    })
  }

  static propTypes = {
    release: PropTypes.string.isRequired,
    variant: PropTypes.string.isRequired,
    classes: PropTypes.object
  }

  fetchData (props) {
    fetch(process.env.REACT_APP_API_URL + '/api/variants?release=' + this.props.release + '&variant=' + this.props.variant)
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('server returned ' + response.status)
        }
        return response.json()
      })
      .then(json => {
        this.setState({
          isLoaded: true,
          variants: json,
          rows: json
        })
      }).catch(error => {
        this.setState({ fetchError: 'Could not retrieve tests ' + this.props.release + ', ' + error })
      })
  }

  componentDidMount () {
    this.fetchData(this.props)
  }

  requestSearch (searchValue) {
    this.setState({ searchText: searchValue })
    const searchRegex = new RegExp(escapeRegExp(searchValue), 'i')
    const filteredRows = this.state.variants.filter((row) => {
      return Object.keys(row).some((field) => {
        return searchRegex.test(row[field].toString())
      })
    })
    this.setState({ rows: filteredRows })
  };

  render () {
    const { classes } = this.props

    if (this.state.fetchError !== '') {
      return <Alert severity="error">{this.state.fetchError}</Alert>
    }

    if (this.state.isLoaded === false) {
      return 'Loading...'
    }

    if (this.state.variants.length === 0) {
      return <p>No jobs.</p>
    }

    return (
      <Container size="xl" style={{ margin: 20 }}>
        <DataGrid
          components={{ Toolbar: QuickSearchToolbar }}
          rows={this.state.rows}
          columns={columns}
          autoHeight={true}
          pageSize={10}
          getRowClassName={(params =>
            clsx({
              [classes.good]: (params.row.current_pass_percentage >= 80),
              [classes.ok]: (params.row.current_pass_percentage >= 60 && params.row.current_pass_percentage < 80),
              [classes.failing]: (params.row.current_pass_percentage < 60)
            })
          )}
          componentsProps={{
            toolbar: {
              value: this.state.searchText,
              onChange: (event) => this.requestSearch(event.target.value),
              clearSearch: () => this.requestSearch('')
            }
          }}

        />
      </Container>
    )
  }
}

export default withStyles(styles, { withTheme: true })(VariantTable)
