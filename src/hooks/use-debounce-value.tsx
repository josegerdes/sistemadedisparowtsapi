import { useEffect, useState } from "react";

interface Props<T> {
  delay: number;
  cb: T;
}

export function useDebounceValue<T>({ cb, delay }: Props<T>) {
  const [debounceValue, setDebounceValue] = useState(cb);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounceValue(cb);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [cb, delay]);

  return debounceValue;
}
