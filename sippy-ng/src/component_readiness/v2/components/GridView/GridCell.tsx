import { Status } from '../../types'
import { TableCell } from '@mui/material'
import React from 'react'
import StatusIcon from '../shared/StatusIcon'

interface GridCellProps {
  status: Status
  regressedCount?: number
  onClick?: () => void
}

const GridCell: React.FC<GridCellProps> = ({
  status,
  regressedCount,
  onClick,
}) => {
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
      <StatusIcon status={status} regressedCount={regressedCount} />
    </TableCell>
  )
}

export default GridCell
