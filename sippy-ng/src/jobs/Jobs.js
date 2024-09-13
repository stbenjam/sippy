import { Box, Container, Paper, Tab, Tabs, Typography } from '@mui/material'
import { filterFor } from '../helpers'
import {
  Link,
  Route,
  Routes,
  useLocation,
  useResolvedPath,
} from 'react-router-dom'
import { TabContext } from '@mui/lab'
import JobRunsTable from './JobRunsTable'
import JobsDetail from './JobsDetail'
import JobTable from './JobTable'
import PropTypes from 'prop-types'
import React, { Fragment, useEffect } from 'react'
import SimpleBreadcrumbs from '../components/SimpleBreadcrumbs'

/**
 * Jobs is the landing page for jobs with tabs for all jobs, variants,
 * and job runs.
 */
export default function Jobs(props) {
  const location = useLocation()
  const resolvedPath = useResolvedPath('')

  useEffect(() => {
    document.title = `Sippy > ${props.release} > Jobs`
  }, [])

  return (
    <Fragment>
      <SimpleBreadcrumbs release={props.release} currentPage="Jobs" />
      <TabContext value={location.pathname}>
        <Typography align="center" variant="h4">
          Job health for {props.release}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Paper
            sx={{
              margin: 2,
              border: 1,
              borderColor: 'divider',
              display: 'inline-block',
            }}
          >
            <Tabs
              value={location.pathname.substring(
                location.pathname.lastIndexOf('/') + 1
              )}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab
                label="All jobs"
                value={props.release}
                component={Link}
                to={resolvedPath.pathname}
                sx={{ padding: '6px 12px !important' }}
              />
              <Tab
                label="Permafailing"
                value="permafailing"
                component={Link}
                to={`${resolvedPath.pathname}/permafailing`}
                sx={{ padding: '6px 12px !important' }}
              />
              <Tab
                label="All job runs"
                value="runs"
                component={Link}
                to={`${resolvedPath.pathname}/runs`}
                sx={{ padding: '6px 12px !important' }}
              />
            </Tabs>
          </Paper>
        </Box>
        <Container size="xl">
          <Routes>
            <Route
              path="runs"
              element={<JobRunsTable release={props.release} />}
            />
            <Route
              path="permafailing"
              element={
                <JobTable
                  release={props.release}
                  filterModel={{
                    items: [
                      filterFor('current_pass_percentage', '=', '0'),
                      filterFor('previous_pass_percentage', '=', '0'),
                    ],
                  }}
                  sortField="last_pass"
                  sort="desc"
                  view="Last passing"
                  hideControls="true"
                />
              }
            />
            <Route path="/" element={<JobTable release={props.release} />} />
          </Routes>
        </Container>
      </TabContext>
    </Fragment>
  )
}

Jobs.propTypes = {
  release: PropTypes.string.isRequired,
}
