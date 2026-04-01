import {
  AppBar,
  Box,
  FormControlLabel,
  IconButton,
  Popover,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Clear as ClearIcon,
  ContentCopy as ContentCopyIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import React, { useState } from 'react'

interface GridToolbarProps {
  searchRowRegex: string
  onSearchRowChange: (value: string) => void
  redOnlyChecked: boolean
  onRedOnlyChange: (checked: boolean) => void
  generatedAt?: string
}

const GridToolbar: React.FC<GridToolbarProps> = ({
  searchRowRegex,
  onSearchRowChange,
  redOnlyChecked,
  onRedOnlyChange,
  generatedAt,
}) => {
  const [copyPopoverEl, setCopyPopoverEl] = useState<HTMLElement | null>(null)

  const handleCopyUrl = (event: React.MouseEvent<HTMLElement>) => {
    navigator.clipboard.writeText(window.location.href)
    setCopyPopoverEl(event.currentTarget)
    setTimeout(() => setCopyPopoverEl(null), 2000)
  }

  const handleClearSearch = () => {
    onSearchRowChange('')
  }

  return (
    <Box sx={{ mb: 1 }}>
      <AppBar elevation={1} position="static" color="default">
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SearchIcon fontSize="small" color="action" />
            <TextField
              size="small"
              placeholder="Search components..."
              value={searchRowRegex}
              onChange={(e) => onSearchRowChange(e.target.value)}
              variant="outlined"
              sx={{ width: 200 }}
              inputProps={{ 'aria-label': 'search components' }}
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={redOnlyChecked}
                onChange={(e) => onRedOnlyChange(e.target.checked)}
                size="small"
                color="primary"
              />
            }
            label="Red Only"
          />

          <IconButton size="small" onClick={handleClearSearch}>
            <Tooltip title="Clear search">
              <ClearIcon fontSize="small" />
            </Tooltip>
          </IconButton>

          <IconButton size="small" onClick={handleCopyUrl}>
            <Tooltip title="Copy URL">
              <ContentCopyIcon fontSize="small" />
            </Tooltip>
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          {generatedAt && (
            <Typography variant="caption" color="text.secondary">
              Generated at: {new Date(generatedAt).toLocaleString()}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      <Popover
        open={Boolean(copyPopoverEl)}
        anchorEl={copyPopoverEl}
        onClose={() => setCopyPopoverEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Typography sx={{ p: 1 }}>Link copied!</Typography>
      </Popover>
    </Box>
  )
}

export default GridToolbar
