import { Box } from '@mui/material'
import GridView from './components/GridView/GridView'
import React from 'react'
import Sidebar from './components/Sidebar/Sidebar'

const ComponentReadiness: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <GridView />
      </Box>
    </Box>
  )
}

export default ComponentReadiness
