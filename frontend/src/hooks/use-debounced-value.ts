import * as React from 'react';

/** Delays reflecting `value` until it stops changing for `delayMs` — use for search inputs so a
 * query fires once typing pauses, not on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
