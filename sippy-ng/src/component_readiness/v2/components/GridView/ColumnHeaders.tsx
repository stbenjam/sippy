import { ColumnIdentification } from '../../types'
import { TableCell, TableHead, TableRow } from '@mui/material'
import React from 'react'

interface ColumnHeadersProps {
  columns: ColumnIdentification[]
}

function formatColumnLabel(column: ColumnIdentification): string {
  const variants = column.variants
  return Object.keys(variants)
    .map((key) => variants[key])
    .join(' / ')
}

const ColumnHeaders: React.FC<ColumnHeadersProps> = ({ columns }) => {
  return (
    <TableHead>
      <TableRow>
        <TableCell
          sx={{
            fontWeight: 'bold',
            position: 'sticky',
            left: 0,
            zIndex: 2,
            backgroundColor: 'background.paper',
            minWidth: 175,
          }}
        >
          Component
        </TableCell>
        {columns.map((col, index) => (
          <TableCell
            key={index}
            sx={{
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '4px',
              whiteSpace: 'nowrap',
              position: 'sticky',
              top: 0,
              zIndex: 1,
              backgroundColor: 'background.paper',
            }}
          >
            <span
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                display: 'inline-block',
                fontSize: '11px',
                maxHeight: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {formatColumnLabel(col)}
            </span>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  )
}

export default ColumnHeaders
