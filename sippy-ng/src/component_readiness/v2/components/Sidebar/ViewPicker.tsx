import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material'
import React from 'react'

interface ViewPickerProps {
  views: string[]
  selectedView: string | null
  onChange: (view: string) => void
}

const ViewPicker: React.FC<ViewPickerProps> = ({
  views,
  selectedView,
  onChange,
}) => {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value)
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
          <MenuItem key={view} value={view}>
            {view}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default ViewPicker
