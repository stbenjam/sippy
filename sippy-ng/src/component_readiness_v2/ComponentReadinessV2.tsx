import { Container, Typography } from '@mui/material'
import React from 'react'

const ComponentReadinessV2: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4">Component Readiness v2</Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        This is the new Component Readiness interface. Under construction.
      </Typography>
    </Container>
  )
}

export default ComponentReadinessV2
