import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}

/**
 * Runs `fn` on mount and whenever `deps` change. A request that resolves after
 * a newer one was started is discarded, so fast filter changes can't flicker
 * stale results back onto the page.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const ticket = ++seq.current;
    setLoading(true);
    setError(null);

    fnRef.current().then(
      (result) => {
        if (ticket !== seq.current) return;
        setData(result);
        setLoading(false);
      },
      (e: unknown) => {
        if (ticket !== seq.current) return;
        setError(errorMessage(e));
        setLoading(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}

/** Debounces a fast-changing value (search boxes, price sliders). */
export function useDebounced<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}
