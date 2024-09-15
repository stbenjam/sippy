import './Upgrades.css'
import { Grid, Typography } from '@mui/material'
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useResolvedPath,
} from 'react-router-dom'
import Alert from '@mui/material/Alert'
import PropTypes from 'prop-types'
import React, { Fragment, useEffect } from 'react'
import SimpleBreadcrumbs from '../components/SimpleBreadcrumbs'
import TestByVariantTable from '../tests/TestByVariantTable'

/**
 *  Upgrades is the landing page for upgrades.
 */
export default function Upgrades(props) {
  const resolvedPath = useResolvedPath('')
  const navigate = useNavigate()

  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [data, setData] = React.useState({})

  const fetchData = () => {
    fetch(
      process.env.REACT_APP_API_URL + '/api/upgrade?release=' + props.release
    )
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('server returned ' + response.status)
        }
        return response.json()
      })
      .then((json) => {
        setData(json)
        setLoaded(true)
      })
      .catch((error) => {
        setFetchError(
          'Could not retrieve release ' + props.release + ', ' + error
        )
      })
  }

  useEffect(() => {
    document.title = `Sippy > ${props.release} > Upgrade health`
    fetchData()
    // Navigate to /operators by default
    navigate(`${resolvedPath.pathname}/operators`, { replace: true })
  }, [props.release, navigate, resolvedPath.pathname])

  if (fetchError !== '') {
    return <Alert severity="error">Failed to load data, {fetchError}</Alert>
  }

  if (!isLoaded) {
    return <p>Loading...</p>
  }

  return (
    <Fragment>
      <SimpleBreadcrumbs release={props.release} currentPage="Upgrades" />
      <Grid>
        <Typography variant="h4" style={{ margin: 10 }} align="center">
          Upgrade health for {props.release}
        </Typography>
      </Grid>
      <Routes>
        <Route
          path="operators"
          element={
            <TestByVariantTable
              release={props.release}
              colorScale={[90, 100]}
              data={data}
            />
          }
        />
        {/* Default redirect to /operators */}
        <Route path="*" element={<Navigate to="operators" replace />} />
      </Routes>
    </Fragment>
  )
}

Upgrades.propTypes = {
  release: PropTypes.string.isRequired,
}
