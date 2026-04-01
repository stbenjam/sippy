import { Badge, Tooltip } from '@mui/material'
import {
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Favorite as FavoriteIcon,
  HelpOutline as HelpOutlineIcon,
  RemoveCircle as RemoveCircleIcon,
} from '@mui/icons-material'
import { Status, statusLabel } from '../../types'
import React from 'react'

export function statusColor(status: Status): string {
  if (
    status === Status.ExtremeRegression ||
    status === Status.SignificantRegression ||
    status === Status.FailedFixedRegression
  ) {
    return '#d32f2f' // red
  }
  if (
    status === Status.ExtremeTriagedRegression ||
    status === Status.SignificantTriagedRegression ||
    status === Status.FixedRegression
  ) {
    return '#ed6c02' // orange
  }
  if (
    status === Status.MissingSample ||
    status === Status.MissingBasis ||
    status === Status.MissingBasisAndSample
  ) {
    return '#9e9e9e' // gray
  }
  if (status === Status.SignificantImprovement) {
    return '#2e7d32' // green
  }
  // NotSignificant (OK)
  return '#2e7d32' // green
}

interface StatusIconProps {
  status: Status
  regressedCount?: number
  size?: 'small' | 'medium'
}

const StatusIcon: React.FC<StatusIconProps> = ({
  status,
  regressedCount,
  size = 'small',
}) => {
  const color = statusColor(status)
  const label = statusLabel(status)
  const iconSize = size === 'small' ? 20 : 28

  const icon = (() => {
    if (
      status === Status.ExtremeRegression ||
      status === Status.SignificantRegression ||
      status === Status.FailedFixedRegression
    ) {
      return <CancelIcon sx={{ color, fontSize: iconSize }} />
    }
    if (
      status === Status.ExtremeTriagedRegression ||
      status === Status.SignificantTriagedRegression ||
      status === Status.FixedRegression
    ) {
      return <RemoveCircleIcon sx={{ color, fontSize: iconSize }} />
    }
    if (
      status === Status.MissingSample ||
      status === Status.MissingBasis ||
      status === Status.MissingBasisAndSample
    ) {
      return <HelpOutlineIcon sx={{ color, fontSize: iconSize }} />
    }
    if (status === Status.SignificantImprovement) {
      return <FavoriteIcon sx={{ color, fontSize: iconSize }} />
    }
    return <CheckCircleIcon sx={{ color, fontSize: iconSize }} />
  })()

  const content = (
    <Tooltip title={label}>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {icon}
      </span>
    </Tooltip>
  )

  if (regressedCount && regressedCount > 1 && status < -100) {
    return (
      <Badge
        badgeContent={regressedCount}
        color="error"
        sx={{
          '& .MuiBadge-badge': {
            height: 14,
            minWidth: 14,
            fontSize: '0.65rem',
          },
        }}
      >
        {content}
      </Badge>
    )
  }

  return content
}

export default StatusIcon
