import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#003366', // Formal navy blue
      light: '#335c85',
      dark: '#002244',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#555555', // Formal grey
      light: '#777777',
      dark: '#333333',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f4f6f8', // Very light grey for background to make white boxes pop
      paper: '#ffffff',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    info: {
      main: '#0288d1',
    },
    success: {
      main: '#2e7d32',
    },
  },
  shape: {
    borderRadius: 0, // Strict rectangular design
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none', // Formal, non-shouting buttons
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)', // Very light shadow for clean look
          border: '1px solid #e0e0e0', // Subtle border for definition
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
  },
});

export default theme;
