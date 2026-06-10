// useDebouncedValue: returns `value` only after it has been stable for `ms`.
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
