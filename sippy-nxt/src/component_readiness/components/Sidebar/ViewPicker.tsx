import { alpha, Autocomplete, TextField, useTheme } from '@mui/material'
import type { View } from '../../types'

interface ViewPickerProps {
  views: View[]
  selectedView: string | null
  onViewChange: (view: string) => void
}

export default function ViewPicker({
  views,
  selectedView,
  onViewChange,
}: ViewPickerProps) {
  const theme = useTheme()
  const selected = views.find((v) => v.name === selectedView) ?? null

  return (
    <Autocomplete
      size="small"
      options={views}
      getOptionLabel={(v) => v.name}
      value={selected}
      onChange={(_, v) => v && onViewChange(v.name)}
      filterOptions={(options, { inputValue }) => {
        if (!inputValue) return options
        const lower = inputValue.toLowerCase()
        return options.filter((o) => o.name.toLowerCase().includes(lower))
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search views…"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.5,
              fontSize: '0.85rem',
              fontWeight: 500,
              bgcolor: alpha(theme.palette.action.hover, 0.04),
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(theme.palette.divider, 0.15),
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(theme.palette.primary.main, 0.3),
              },
            },
          }}
        />
      )}
      disablePortal={false}
      slotProps={{
        popper: {
          placement: 'bottom-start',
          sx: { zIndex: (t) => t.zIndex.modal + 1 },
        },
        paper: {
          sx: {
            maxHeight: 360,
            borderRadius: 1.5,
            mt: 0.5,
            '& .MuiAutocomplete-option': {
              fontSize: '0.82rem',
              py: 0.75,
              borderRadius: 1,
              mx: 0.5,
              '&[aria-selected="true"]': {
                fontWeight: 600,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              },
            },
          },
        },
      }}
    />
  )
}
