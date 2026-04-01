import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material'
import { ViewResponse } from '../../types'
import React from 'react'

interface ViewPickerProps {
  views: ViewResponse[]
  selectedView: string | null
  onViewChange: (view: string) => void
}

const ViewPicker: React.FC<ViewPickerProps> = ({
  views,
  selectedView,
  onViewChange,
}) => {
  const handleChange = (event: SelectChangeEvent) => {
    onViewChange(event.target.value)
  }

  return (
    <FormControl fullWidth size="small" sx={{ mb: 1 }}>
      <InputLabel id="view-picker-label">View</InputLabel>
      <Select
        labelId="view-picker-label"
        value={selectedView ?? ''}
        label="View"
        onChange={handleChange}
      >
        {views.map((view) => (
          <MenuItem key={view.name} value={view.name}>
            {view.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default ViewPicker
