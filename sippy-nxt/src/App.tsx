import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  ThemeProvider,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import {
  ChevronLeft as ChevronLeftIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Menu as MenuIcon,
} from '@mui/icons-material'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import ComponentReadiness from './component_readiness/ComponentReadiness'
import { createSippyTheme, DRAWER_WIDTH } from './theme'

const queryClient = new QueryClient()

export default function App() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [mode, setMode] = useState<'light' | 'dark'>(
    prefersDark ? 'dark' : 'light',
  )
  const [drawerOpen, setDrawerOpen] = useState(true)

  const theme = useMemo(() => createSippyTheme(mode), [mode])

  const toggleMode = useCallback(
    () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
    [],
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename="/sippy-ng">
          <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* AppBar */}
            <AppBar
              position="fixed"
              color="primary"
              enableColorOnDark
              sx={{
                zIndex: (t) => t.zIndex.drawer + 1,
                transition: (t) =>
                  t.transitions.create(['width', 'margin'], {
                    easing: t.transitions.easing.sharp,
                    duration: t.transitions.duration.leavingScreen,
                  }),
                ...(drawerOpen && {
                  marginLeft: DRAWER_WIDTH,
                  width: `calc(100% - ${DRAWER_WIDTH}px)`,
                  transition: (t) =>
                    t.transitions.create(['width', 'margin'], {
                      easing: t.transitions.easing.easeOut,
                      duration: t.transitions.duration.enteringScreen,
                    }),
                }),
              }}
            >
              <Toolbar>
                {!drawerOpen && (
                  <IconButton
                    color="inherit"
                    edge="start"
                    onClick={() => setDrawerOpen(true)}
                    sx={{ mr: 2 }}
                  >
                    <MenuIcon />
                  </IconButton>
                )}
                <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                  Sippy
                </Typography>
                <IconButton color="inherit" onClick={toggleMode} size="small">
                  {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Toolbar>
            </AppBar>

            {/* Drawer */}
            <Drawer
              variant="persistent"
              open={drawerOpen}
              sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                  width: DRAWER_WIDTH,
                  boxSizing: 'border-box',
                  overflowX: 'hidden',
                  overflowY: 'hidden !important' as never,
                },
              }}
            >
              <Toolbar
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  px: 1,
                }}
              >
                <IconButton onClick={() => setDrawerOpen(false)}>
                  <ChevronLeftIcon />
                </IconButton>
              </Toolbar>
              <Divider />
              {/* Page-specific sidebar content is rendered inside the route */}
              <Box
                id="sidebar-portal"
                sx={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
              />
            </Drawer>

            {/* Main content */}
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                transition: (t) =>
                  t.transitions.create('margin', {
                    easing: t.transitions.easing.sharp,
                    duration: t.transitions.duration.leavingScreen,
                  }),
                marginLeft: drawerOpen ? 0 : `-${DRAWER_WIDTH}px`,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden',
              }}
            >
              <Toolbar /> {/* spacer for fixed AppBar */}
              <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Routes>
                  <Route
                    path="/component_readiness/*"
                    element={<ComponentReadiness />}
                  />
                  <Route
                    path="*"
                    element={<Navigate to="/component_readiness" replace />}
                  />
                </Routes>
              </Box>
            </Box>
          </Box>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
