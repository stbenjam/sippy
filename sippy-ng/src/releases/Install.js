import './Install.css'
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
import TopLevelIndicators from './InstallTopLevelIndicators'

export default function Install(props) {
  const resolvedPath = useResolvedPath('') // Base path
  const navigate = useNavigate() // For programmatic navigation

  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [data, setData] = React.useState({})
  const [health, setHealth] = React.useState({})

  const fetchData = () => {
    Promise.all([
      fetch(
        process.env.REACT_APP_API_URL + '/api/install?release=' + props.release
      ),
      fetch(
        process.env.REACT_APP_API_URL + '/api/health?release=' + props.release
      ),
    ])
      .then(([install, health]) => {
        if (install.status !== 200) {
          throw new Error('server returned ' + install.status)
        }

        if (health.status !== 200) {
          throw new Error('server returned ' + health.status)
        }
        return Promise.all([install.json(), health.json()])
      })
      .then(([install, health]) => {
        setData(install)
        setHealth(health)
        setLoaded(true)
      })
      .catch((error) => {
        setFetchError(
          'Could not retrieve install for release ' +
            props.release +
            ', ' +
            error
        )
      })
  }

  useEffect(() => {
    document.title = `Sippy > ${props.release} > Install health`
    fetchData()
    // Navigate to /operators on first load
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
      <SimpleBreadcrumbs release={props.release} currentPage="Install" />
      <Grid>
        <Typography variant="h4" style={{ margin: 10 }} align="center">
          Install health for {props.release}
        </Typography>
      </Grid>
      <Grid container justifyContent="center" spacing={3}>
        <TopLevelIndicators
          release={props.release}
          indicators={health.indicators}
        />
      </Grid>
      <Grid>
        <Routes>
          <Route
            path="operators"
            element={
              <TestByVariantTable
                release={props.release}
                colorScale={[90, 100]}
                data={data}
                excludedVariants={[
                  'upgrade-minor',
                  'aggregated',
                  'never-stable',
                ]}
              />
            }
          />
          {/* Default redirect to /operators */}
          <Route path="*" element={<Navigate to="operators" replace />} />
        </Routes>
      </Grid>
    </Fragment>
  )
}

Install.propTypes = {
  release: PropTypes.string,
}
