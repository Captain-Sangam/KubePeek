'use client';

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { RefreshContext, type Freshness } from '../lib/RefreshContext';

interface FetchState<T> extends Freshness {
  data: T | null;
  loading: boolean;
  error: string | null;
  authError: boolean;
  refetch: () => void;
}

interface Snapshot<T> extends Omit<FetchState<T>, 'refetch'> {
  url: string | null;
}

const emptySnapshot = <T,>(url: string | null): Snapshot<T> => ({
  url, data: null, loading: Boolean(url), error: null, authError: false,
  isRefreshing: false, lastUpdated: null, refreshError: null,
});

// URL changes reset the target; refetches retain its last successful data.
// Poll ticks skip requests in flight, hidden windows, and expired credentials.
export function useFetch<T>(url: string | null, options: { refreshMs?: number; reportFreshness?: boolean } = {}): FetchState<T> {
  const context = useContext(RefreshContext);
  const refreshMs = options.refreshMs ?? context.refreshMs;
  const [snapshot, setSnapshot] = useState<Snapshot<T>>(() => emptySnapshot<T>(url));
  const snapshotRef = useRef(snapshot);
  const inFlight = useRef(false);
  const authStopped = useRef(false);
  const [nonce, setNonce] = useState(0);

  const update = useCallback((next: Snapshot<T>) => {
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const refetch = useCallback(() => {
    if (inFlight.current) return;
    authStopped.current = false;
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!url) {
      update(emptySnapshot<T>(null));
      authStopped.current = false;
      return;
    }

    const controller = new AbortController();
    let active = true;
    const previous = snapshotRef.current;
    const current = previous.url === url ? previous : emptySnapshot<T>(url);
    const hasData = current.data !== null;
    authStopped.current = false;
    inFlight.current = true;
    update({ ...current, loading: !hasData, isRefreshing: hasData, error: null, authError: false });

    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          let message = `Request failed (${res.status})`;
          let auth = res.status === 401;
          try {
            const body = await res.json();
            if (body?.error === 'auth_expired') auth = true;
            message = body?.message || body?.error || message;
          } catch { /* A proxy/network failure need not return JSON. */ }
          throw Object.assign(new Error(auth ? 'auth_expired' : message), { authError: auth });
        }
        return res.json();
      })
      .then((data: T) => {
        if (active) update({
          url, data, loading: false, error: null, authError: false,
          isRefreshing: false, lastUpdated: Date.now(), refreshError: null,
        });
      })
      .catch((err) => {
        if (!active || err.name === 'AbortError') return;
        const authError = Boolean(err.authError);
        authStopped.current = authError;
        const message = err instanceof Error ? err.message : 'Unknown error';
        update({
          ...current, loading: false, isRefreshing: false, authError,
          error: hasData ? null : message,
          refreshError: hasData ? message : null,
        });
      })
      .finally(() => { if (active) inFlight.current = false; });

    return () => {
      active = false;
      controller.abort();
      inFlight.current = false;
    };
  }, [url, nonce, update]);

  useEffect(() => {
    if (!url || refreshMs <= 0) return;
    const tick = () => {
      if (!document.hidden && !inFlight.current && !authStopped.current) setNonce((n) => n + 1);
    };
    // A previously hidden tab refreshes as soon as it becomes active.
    if (snapshotRef.current.url === url && snapshotRef.current.lastUpdated !== null) tick();
    const interval = window.setInterval(tick, refreshMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [url, refreshMs]);

  // Do not expose old rows even for the render before the new URL's effect runs.
  const state = snapshot.url === url ? snapshot : emptySnapshot<T>(url);
  const { onAuthError } = context;
  const report = options.reportFreshness === false ? undefined : context.report;
  const { lastUpdated, isRefreshing, refreshError, authError } = state;
  useEffect(() => {
    if (url) report?.(url, { lastUpdated, isRefreshing, refreshError });
  }, [url, report, lastUpdated, isRefreshing, refreshError]);
  useEffect(() => () => { if (url) report?.(url, null); }, [url, report]);
  useEffect(() => { if (authError) onAuthError?.(); }, [authError, onAuthError]);

  return { ...state, refetch };
}
