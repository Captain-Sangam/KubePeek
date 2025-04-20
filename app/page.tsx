'use client';

import { useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import Dashboard from './components/Dashboard';
import Header from './components/Header';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Header />
      
      <Box sx={{ 
        flex: 1, 
        overflow: 'hidden', 
        p: 2
      }}>
        {isLoading ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%' 
          }}>
            <CircularProgress />
          </Box>
        ) : (
          <Dashboard />
        )}
      </Box>
    </Box>
  );
}
