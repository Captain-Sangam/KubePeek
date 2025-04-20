'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    // Load theme preference from localStorage
    const savedMode = localStorage.getItem('themeMode') as ThemeMode;
    if (savedMode) {
      setMode(savedMode);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
    
    // Force update document body attributes
    document.body.dataset.theme = newMode;
    
    // Force a re-render of all component styles by applying a theme class
    if (newMode === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
  };

  // Create a memoized theme object that only updates when mode changes
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#3f88f5',
      },
      secondary: {
        main: '#f50057',
      },
      text: {
        primary: mode === 'light' ? '#212121' : '#e0e0e0',
        secondary: mode === 'light' ? '#616161' : '#b0b0b0',
      },
      background: {
        default: mode === 'light' ? '#f8f9fa' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
      action: {
        active: mode === 'light' ? 'rgba(0, 0, 0, 0.54)' : 'rgba(255, 255, 255, 0.7)',
        hover: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
        selected: mode === 'light' ? 'rgba(63, 136, 245, 0.12)' : 'rgba(63, 136, 245, 0.24)',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      allVariants: {
        color: mode === 'light' ? '#212121' : '#e0e0e0',
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: mode === 'light' 
              ? '0 1px 3px rgba(0,0,0,0.05)' 
              : '0 1px 3px rgba(0,0,0,0.3)',
            borderRadius: 8,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 6,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: mode === 'light' 
              ? '1px solid rgba(224, 224, 224, 1)' 
              : '1px solid rgba(81, 81, 81, 1)',
            color: mode === 'light' ? '#212121' : '#e0e0e0',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: mode === 'light' ? '#616161' : '#e0e0e0',
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            color: mode === 'light' ? '#212121' : '#e0e0e0',
          },
          secondary: {
            color: mode === 'light' ? '#616161' : '#a0a0a0',
          },
        },
      },
    },
  }), [mode]);

  // Set initial theme class and data attribute on first render
  useEffect(() => {
    document.body.dataset.theme = mode;
    if (mode === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
} 