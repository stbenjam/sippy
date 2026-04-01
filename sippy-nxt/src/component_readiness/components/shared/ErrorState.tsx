import { Alert, Box } from '@mui/material'

interface ErrorStateProps {
  message: string
}

export default function ErrorState({ message }: ErrorStateProps) {
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error" variant="outlined">
        {message}
      </Alert>
    </Box>
  )
}
