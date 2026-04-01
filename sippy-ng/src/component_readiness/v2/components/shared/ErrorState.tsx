import { Alert, Box } from '@mui/material'
import React from 'react'

interface ErrorStateProps {
  message: string
}

const ErrorState: React.FC<ErrorStateProps> = ({ message }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Alert severity="error">{message}</Alert>
    </Box>
  )
}

export default ErrorState
