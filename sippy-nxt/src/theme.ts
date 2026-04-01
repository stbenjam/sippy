import { createTheme } from '@mui/material'

export const DRAWER_WIDTH = 260
export const APPBAR_COLOR = '#2E7D32'

export function createSippyTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: { main: APPBAR_COLOR },
      ...(mode === 'light'
        ? {
            info: { main: '#00BCD4', light: '#4DD0E1', dark: '#0097A7' },
            success: { main: '#66BB6A', light: '#81C784', dark: '#388E3C' },
            warning: { main: '#FF9800', light: '#FFB74D', dark: '#F57C00' },
            error: { main: '#F44336', light: '#E57373', dark: '#D32F2F' },
            background: { default: '#fafafa', paper: '#fff' },
          }
        : {}),
    },
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { margin: 0 },
        },
      },
    },
  })
}
