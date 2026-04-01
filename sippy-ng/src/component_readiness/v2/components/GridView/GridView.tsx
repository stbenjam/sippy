import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material'
import {
  ColumnIdentification,
  ComponentReport,
  isRegression,
  ReportRow,
} from '../../types'
import ColumnHeaders from './ColumnHeaders'
import GridCell from './GridCell'
import GridToolbar from './GridToolbar'
import LoadingState from '../shared/LoadingState'
import React, { useMemo, useState } from 'react'

interface GridViewProps {
  report?: ComponentReport
  onCellClick?: (component: string, column: ColumnIdentification) => void
  searchFilter?: string
  redOnlyFilter?: boolean
}

function getColumns(report: ComponentReport): ColumnIdentification[] {
  if (!report.rows || report.rows.length === 0) return []
  return report.rows[0].columns.map((col) => ({ variants: col.variants }))
}

function hasRegression(row: ReportRow): boolean {
  return row.columns.some((col) => isRegression(col.status))
}

const GridView: React.FC<GridViewProps> = ({
  report,
  onCellClick,
  searchFilter: externalSearch,
  redOnlyFilter: externalRedOnly,
}) => {
  const [internalSearch, setInternalSearch] = useState('')
  const [internalRedOnly, setInternalRedOnly] = useState(false)

  // Use external values if provided, otherwise fall back to internal state
  const searchRowRegex = externalSearch ?? internalSearch
  const redOnlyChecked = externalRedOnly ?? internalRedOnly

  const columns = useMemo(() => {
    if (!report) return []
    return getColumns(report)
  }, [report])

  const filteredRows = useMemo(() => {
    if (!report?.rows) return []

    let rows = [...report.rows].sort((a, b) =>
      a.component.localeCompare(b.component)
    )

    if (searchRowRegex) {
      try {
        const regex = new RegExp(searchRowRegex, 'i')
        rows = rows.filter((row) => regex.test(row.component))
      } catch {
        const lower = searchRowRegex.toLowerCase()
        rows = rows.filter((row) => row.component.toLowerCase().includes(lower))
      }
    }

    if (redOnlyChecked) {
      rows = rows.filter(hasRegression)
    }

    return rows
  }, [report, searchRowRegex, redOnlyChecked])

  if (!report) {
    return <LoadingState message="Loading component readiness data..." />
  }

  return (
    <Box>
      <GridToolbar
        searchRowRegex={searchRowRegex}
        onSearchRowChange={setInternalSearch}
        redOnlyChecked={redOnlyChecked}
        onRedOnlyChange={setInternalRedOnly}
        generatedAt={report.generated_at}
      />

      <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
        <Table size="small" stickyHeader>
          <ColumnHeaders columns={columns} />
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.component} hover>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    backgroundColor: 'background.paper',
                    minWidth: 175,
                    maxWidth: 175,
                    fontSize: '11px',
                  }}
                >
                  {row.component}
                </TableCell>
                {row.columns.map((col, colIndex) => (
                  <GridCell
                    key={colIndex}
                    column={col}
                    onClick={
                      onCellClick
                        ? () => onCellClick(row.component, columns[colIndex])
                        : undefined
                    }
                  />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default GridView
