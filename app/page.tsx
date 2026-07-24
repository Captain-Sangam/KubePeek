'use client';

import Dashboard from './components/Dashboard';
import Header from './components/Header';

export default function Home() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <div style={{ flex: 1, overflow: 'hidden', padding: 'var(--spacing-4)' }}>
        <Dashboard />
      </div>
    </div>
  );
}
