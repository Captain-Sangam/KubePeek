'use client';

import { createContext } from 'react';

export interface Freshness {
  lastUpdated: number | null;
  isRefreshing: boolean;
  refreshError: string | null;
}

export interface ViewStatus extends Freshness {
  scope: string | null;
}

// Hidden tabs stay mounted. This context controls their polling and lets the
// visible view (including its detail panels) report freshness to the header.
export const RefreshContext = createContext<{
  refreshMs: number;
  report?: (url: string, state: Freshness | null) => void;
  onAuthError?: () => void;
}>({ refreshMs: 0 });

export function combineFreshness(queries: Freshness[]): Freshness {
  const updated = queries.map((q) => q.lastUpdated).filter((t): t is number => t !== null);
  return {
    lastUpdated: updated.length ? Math.min(...updated) : null,
    isRefreshing: queries.some((q) => q.isRefreshing),
    refreshError: queries.find((q) => q.refreshError)?.refreshError ?? null,
  };
}
