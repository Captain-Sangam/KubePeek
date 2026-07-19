'use client';

import { useCallback, useEffect, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  // True when the request failed because the cluster credential expired
  // (HTTP 401 / body { error: 'auth_expired' }). Drives the Reconnect banner.
  authError: boolean;
  refetch: () => void;
}

// Minimal fetch hook: pass a URL to fetch it, or null to disable (used for
// lazy tabs / drawers that only load when opened). Aborts in-flight requests
// on URL change or unmount, which fixes the stale-cluster race.
export function useFetch<T>(url: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      setError(null);
      setAuthError(false);
      return;
    }

    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);
    setAuthError(false);

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          let message = `Request failed (${res.status})`;
          let auth = res.status === 401;
          try {
            const body = await res.json();
            if (body?.error === 'auth_expired') auth = true;
            if (body?.message) message = body.message;
          } catch {
            // ignore parse errors
          }
          const err = new Error(auth ? 'auth_expired' : message);
          (err as any).authError = auth;
          throw err;
        }
        return res.json();
      })
      .then((json) => {
        if (active) {
          setData(json as T);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active && err.name !== 'AbortError') {
          setAuthError(Boolean(err?.authError));
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, nonce]);

  return { data, loading, error, authError, refetch };
}
