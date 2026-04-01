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
  data?: ComponentReport
  loading?: boolean
  onCellClick?: (component: string, column: ColumnIdentification) => void
}

function getColumns(data: ComponentReport): ColumnIdentification[] {
  if (!data.rows || data.rows.length === 0) return []
  return data.rows[0].columns.map((col) => ({ variants: col.variants }))
}

function hasRegression(row: ReportRow): boolean {
  return row.columns.some((col) => isRegression(col.status))
}

function regressedTestCount(
  row: ReportRow,
  colIndex: number
): number | undefined {
  const col = row.columns[colIndex]
  if (!col.regressed_tests) return undefined
  return col.regressed_tests.length
}

const GridView: React.FC<GridViewProps> = ({ data, loading, onCellClick }) => {
  const [searchRowRegex, setSearchRowRegex] = useState('')
  const [redOnlyChecked, setRedOnlyChecked] = useState(false)

  const columns = useMemo(() => {
    if (!data) return []
    return getColumns(data)
  }, [data])

  const filteredRows = useMemo(() => {
    if (!data?.rows) return []

    let rows = [...data.rows].sort((a, b) =>
      a.component.localeCompare(b.component)
    )

    if (searchRowRegex) {
      try {
        const regex = new RegExp(searchRowRegex, 'i')
        rows = rows.filter((row) => regex.test(row.component))
      } catch {
        // If invalid regex, fall back to simple string match
        const lower = searchRowRegex.toLowerCase()
        rows = rows.filter((row) => row.component.toLowerCase().includes(lower))
      }
    }

    if (redOnlyChecked) {
      rows = rows.filter(hasRegression)
    }

    return rows
  }, [data, searchRowRegex, redOnlyChecked])

  if (loading || !data) {
    return <LoadingState message="Loading component readiness data..." />
  }

  return (
    <Box>
      <GridToolbar
        searchRowRegex={searchRowRegex}
        onSearchRowChange={setSearchRowRegex}
        redOnlyChecked={redOnlyChecked}
        onRedOnlyChange={setRedOnlyChecked}
        generatedAt={data.generated_at}
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
                    status={col.status}
                    regressedCount={regressedTestCount(row, colIndex)}
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
