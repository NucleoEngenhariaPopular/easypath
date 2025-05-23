import { createTheme, type ThemeOptions } from '@mui/material/styles';

const commonThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
};

// Light theme
export const lightTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'light',
    primary: {
      main: '#FF5722', // Deep Orange
    },
    secondary: {
      main: '#FFC107', // Amber
    },
    error: {
      main: '#D32F2F', // Standard error red
    },
    warning: {
      main: '#FBC02D', // Standard warning yellow
    },
    info: {
      main: '#1976D2', // Standard info blue
    },
    success: {
      main: '#388E3C', // Standard success green
    },
    background: {
      default: '#F5F5F5', // Light grey background
      paper: '#FFFFFF', // White paper background
    },
    text: {
      primary: '#212121', // Dark text
      secondary: '#757575', // Grey text
    },
  },
});

// Dark theme
export const darkTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: '#FF7043', // Lighter Deep Orange for dark mode contrast
    },
    secondary: {
      main: '#FFD54F', // Lighter Amber for dark mode contrast
    },
    error: {
      main: '#EF5350',
    },
    warning: {
      main: '#FFCA28',
    },
    info: {
      main: '#64B5F6',
    },
    success: {
      main: '#66BB6A',
    },
    background: {
      default: '#121212', // Very dark background
      paper: '#1E1E1E', // Darker paper background
    },
    text: {
      primary: '#E0E0E0', // Light text
      secondary: '#BDBDBD', // Lighter grey text
    },
  },
});
