'use client';

import { Box, IconButton, Typography, Tooltip } from '@mui/material';
import { useTheme } from '../lib/ThemeProvider';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

export default function Header() {
  const { mode, toggleTheme } = useTheme();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        px: 3,
        py: 2,
        borderBottom: '1px solid',
        borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
      }}
    >
      <Typography 
        variant="h6" 
        component="h1" 
        sx={{ 
          fontWeight: 600, 
          letterSpacing: '-0.015em',
          fontSize: '1.25rem',
          color: mode === 'light' ? '#212121' : '#ffffff'
        }}
      >
        KubePeek
      </Typography>
      
      <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
        <IconButton 
          onClick={toggleTheme} 
          size="small"
          sx={{ 
            p: 1,
            backgroundColor: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.1)' 
              : 'rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: mode === 'light' 
              ? 'rgba(0, 0, 0, 0.15)' 
              : 'rgba(255, 255, 255, 0.2)',
            color: mode === 'light' ? '#212121' : '#ffffff',
            '&:hover': {
              backgroundColor: mode === 'light' 
                ? 'rgba(0, 0, 0, 0.15)' 
                : 'rgba(255, 255, 255, 0.25)'
            }
          }}
        >
          {mode === 'light' ? 
            <DarkModeIcon fontSize="small" sx={{ color: 'inherit' }} /> : 
            <LightModeIcon fontSize="small" sx={{ color: 'inherit' }} />
          }
        </IconButton>
      </Tooltip>
    </Box>
  );
} 