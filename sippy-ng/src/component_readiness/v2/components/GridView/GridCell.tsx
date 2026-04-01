import { ReportColumn } from '../../types'
import { TableCell } from '@mui/material'
import React from 'react'
import StatusIcon from '../shared/StatusIcon'

interface GridCellProps {
  column: ReportColumn
  onClick?: () => void
}

const GridCell: React.FC<GridCellProps> = ({ column, onClick }) => {
  const regressedCount = column.regressed_tests?.length

  return (
    <TableCell
      onClick={onClick}
      sx={{
        textAlign: 'center',
        height: 50,
        width: 50,
        padding: '5px',
        lineHeight: '13px',
        border: '1px solid #EEE',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { backgroundColor: 'action.hover' } : undefined,
      }}
    >
      <StatusIcon status={column.status} regressedCount={regressedCount} />
    </TableCell>
  )
}

export default GridCell
