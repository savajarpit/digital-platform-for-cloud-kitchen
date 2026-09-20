import { useEffect, useState } from "react";

/** `value`, but only after it has stopped changing for `delayMs` — used so a
 * search box keys its query on the settled text, not on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
