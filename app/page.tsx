'use client';

import { useState } from 'react';
import { Typography, Box, CircularProgress } from '@mui/material';
import Dashboard from './components/Dashboard';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ bgcolor: '#1976d2', color: 'white', p: 2, boxShadow: 1 }}>
        <Typography variant="h5" component="h1">
          KubePeek - Kubernetes Dashboard
        </Typography>
      </Box>
      
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Dashboard />
        )}
      </Box>

      <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          KubePeek - Local Kubernetes Monitoring
        </Typography>
      </Box>
    </Box>
  );
}
