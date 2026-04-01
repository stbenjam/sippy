import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
} from '@mui/material'
import React from 'react'

interface VariantFiltersProps {
  variants: Record<string, string[]>
  selected: Record<string, string[]>
  onChange: (updated: Record<string, string[]>) => void
}

const VariantFilters: React.FC<VariantFiltersProps> = ({
  variants,
  selected,
  onChange,
}) => {
  const variantKeys = Object.keys(variants).sort()

  if (variantKeys.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No variant filters available.
      </Typography>
    )
  }

  const handleToggle = (key: string, value: string) => {
    const current = selected[key] ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onChange({ ...selected, [key]: next })
  }

  return (
    <Box>
      {variantKeys.map((key) => (
        <Box key={key} sx={{ mb: 1 }}>
          <Typography
            variant="caption"
            fontWeight="bold"
            color="text.secondary"
          >
            {key}
          </Typography>
          <FormGroup>
            {variants[key].sort().map((value) => (
              <FormControlLabel
                key={value}
                control={
                  <Checkbox
                    size="small"
                    checked={(selected[key] ?? []).includes(value)}
                    onChange={() => handleToggle(key, value)}
                  />
                }
                label={
                  <Typography variant="body2" noWrap>
                    {value}
                  </Typography>
                }
                sx={{ ml: 0, mr: 0 }}
              />
            ))}
          </FormGroup>
        </Box>
      ))}
    </Box>
  )
}

export default VariantFilters
