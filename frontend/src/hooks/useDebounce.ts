import { useState, useEffect } from 'react';

/**
 * Delays updating a value until the user has stopped changing it
 * for the specified delay period. Used to avoid firing API calls
 * on every keystroke in search inputs.
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}