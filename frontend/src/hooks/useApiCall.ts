import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiCallOptions {
  immediate?: boolean;
  debounceMs?: number;
}

export const useApiCall = <T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  options: UseApiCallOptions = {}
) => {
  const { immediate = true, debounceMs = 300 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('API call error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const debouncedExecute = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(execute, debounceMs);
  }, [execute, debounceMs]);

  useEffect(() => {
    if (immediate) {
      debouncedExecute();
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch: execute,
    debouncedRefetch: debouncedExecute
  };
};
