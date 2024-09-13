import { BOOKMARKS } from '../constants'
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material'
import { Link, Route, Routes, useLocation, useMatch } from 'react-router-dom'
import { pathForAPIWithFilter, withSort } from '../helpers'
import { TabContext } from '@mui/lab'
import PropTypes from 'prop-types'
import React, { Fragment, useEffect } from 'react'
import SimpleBreadcrumbs from '../components/SimpleBreadcrumbs'
import TestTable from './TestTable'

/**
 * Tests is the landing page for tests, with tabs for all tests,
 * and test results by variant.
 */
export default function Tests(props) {
  const match = useMatch('/tests/*')
  const search = useLocation().search
  const { release } = props

  useEffect(() => {
    document.title = `Sippy > ${release} > Tests`
  }, [release])

  return (
    <Fragment>
      <SimpleBreadcrumbs release={release} currentPage="Tests" />

      <TabContext value={match?.pathname || ''}>
        <Typography align="center" variant="h4">
          Tests for {release}
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
              value={
                match?.pathname.substring(
                  match?.pathname.lastIndexOf('/') + 1
                ) || ''
              }
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab
                label="All tests"
                value={release}
                component={Link}
                sx={{ padding: '6px 12px !important' }}
                to={`./${search}`}
              />
              <Tab
                label="Tests by variant"
                value="details"
                sx={{ padding: '6px 12px !important' }}
                component={Link}
                to={`./details${search}`}
              />
              <Tab
                label="Watchlist"
                value="watchlist"
                component={Link}
                sx={{ padding: '6px 12px !important' }}
                to={withSort(
                  pathForAPIWithFilter(`/tests/${release}/watchlist`, {
                    items: [
                      BOOKMARKS.RUN_7,
                      BOOKMARKS.NO_NEVER_STABLE,
                      BOOKMARKS.NO_AGGREGATED,
                      BOOKMARKS.WATCHLIST,
                    ],
                    linkOperator: 'and',
                  }),
                  'current_working_percentage',
                  'asc'
                )}
              />
            </Tabs>
          </Paper>
        </Box>
        <Routes>
          <Route
            path="details"
            element={<TestTable release={release} collapse={false} />}
          />
          <Route
            path="watchlist"
            element={<TestTable release={release} collapse={false} />}
          />
          <Route path="" element={<TestTable release={release} />} />
        </Routes>
      </TabContext>
    </Fragment>
  )
}

Tests.propTypes = {
  release: PropTypes.string.isRequired,
}
