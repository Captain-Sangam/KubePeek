'use client';

import { useCallback, useEffect, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Minimal fetch hook: pass a URL to fetch it, or null to disable (used for
// lazy tabs / drawers that only load when opened). Aborts in-flight requests
// on URL change or unmount, which fixes the stale-cluster race.
export function useFetch<T>(url: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          let message = `Request failed (${res.status})`;
          try {
            const body = await res.json();
            if (body?.message) message = body.message;
          } catch {
            // ignore parse errors
          }
          throw new Error(message);
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
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, nonce]);

  return { data, loading, error, refetch };
}
