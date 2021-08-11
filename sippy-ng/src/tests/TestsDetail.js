import { Backdrop, CircularProgress, makeStyles } from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import React, { Fragment, useEffect } from 'react'
import { ArrayParam, useQueryParam, withDefault } from 'use-query-params'
import GridToolbarFilterBox from '../datagrid/GridToolbarFilterBox'
import TestByVariantTable from './TestByVariantTable'
import PropTypes from 'prop-types'

const useStyles = makeStyles((theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff'
  }
}))

export default function TestsDetails (props) {
  const classes = useStyles()

  const [names, setNames] = useQueryParam('test', withDefault(ArrayParam, []))
  const [query, setQuery] = React.useState('')

  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [data, setData] = React.useState({})

  const nameParams = () => {
    return names.map((param) => '&test=' + encodeURIComponent(param)).join('')
  }

  const fetchData = () => {
    fetch(process.env.REACT_APP_API_URL + '/api/tests/details?release=' + props.release + nameParams())
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('server returned ' + response.status)
        }
        return response.json()
      })
      .then(json => {
        setData(json)
        setQuery(names.join('|'))
        setLoaded(true)
      }).catch(error => {
        setFetchError('Could not retrieve release ' + props.release + ', ' + error)
      })
  }

  useEffect(() => {
    fetchData()
  }, [names])

  if (fetchError !== '') {
    return <Alert severity="error">Failed to load data, {fetchError}</Alert>
  }

  const updateFilter = () => {
    const names = query.match(/([^\\|]|\\.)+/g)
    setLoaded(false)
    setNames(names)
  }

  const filterBox = (
        <Fragment>
            <GridToolbarFilterBox value={query} setValue={setQuery} action={updateFilter} required={true} />
        </Fragment>
  )

  if (!isLoaded) {
    return (
            <Fragment>
                <Backdrop className={classes.backdrop} open={!isLoaded}>
                    Fetching data...
                    <CircularProgress color="inherit" />
                </Backdrop>
                {filterBox}
            </Fragment>
    )
  }

  if (Object.keys(data.tests).length === 0) {
    return filterBox
  }

  return (
        <Fragment>
            {filterBox}
            <TestByVariantTable release={props.release} data={data} />
        </Fragment>
  )
}

TestsDetails.propTypes = {
  release: PropTypes.string.isRequired
}
