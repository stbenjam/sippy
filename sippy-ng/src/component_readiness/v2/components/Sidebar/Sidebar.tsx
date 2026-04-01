import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from '@mui/material'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import { Release } from '../../types'
import React from 'react'
import ReleaseSelector from './ReleaseSelector'
import ViewPicker from './ViewPicker'

interface SidebarProps {
  views?: string[]
  selectedView?: string | null
  onViewChange?: (view: string) => void
  baseRelease?: Release
  sampleRelease?: Release
}

const SIDEBAR_WIDTH = 260

const Sidebar: React.FC<SidebarProps> = ({
  views = [],
  selectedView = null,
  onViewChange,
  baseRelease,
  sampleRelease,
}) => {
  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        minWidth: SIDEBAR_WIDTH,
        borderRight: 1,
        borderColor: 'divider',
        height: '100%',
        overflow: 'auto',
        p: 1,
      }}
    >
      <Accordion defaultExpanded disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">View</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <ViewPicker
            views={views}
            selectedView={selectedView}
            onChange={onViewChange ?? (() => {})}
          />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Releases</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <ReleaseSelector label="Sample Release" release={sampleRelease} />
          <ReleaseSelector label="Basis Release" release={baseRelease} />
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Variant Filters</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary">
            Variant filters will be available in a future update.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  )
}

export default Sidebar
