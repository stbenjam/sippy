import { Box, Typography } from '@mui/material'
import { Release } from '../../types'
import React from 'react'

interface ReleaseSelectorProps {
  label: string
  release?: Release
}

const ReleaseSelector: React.FC<ReleaseSelectorProps> = ({
  label,
  release,
}) => {
  if (!release) {
    return (
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Not configured
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="bold">
        {release.release}
      </Typography>
      {release.start && (
        <Typography variant="caption" color="text.secondary" display="block">
          Start: {new Date(release.start).toLocaleDateString()}
        </Typography>
      )}
      {release.end && (
        <Typography variant="caption" color="text.secondary" display="block">
          End: {new Date(release.end).toLocaleDateString()}
        </Typography>
      )}
    </Box>
  )
}

export default ReleaseSelector
