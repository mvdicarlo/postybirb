import { useCallback, useState } from 'react';

function getInitialValue<T>(name: string): T | undefined {
  try {
    return JSON.parse(localStorage.getItem(name) as string) as T;
  } catch {}

  return undefined;
}

export default function useLocalStorage<T>(name: string, defaultValue?: T) {
  const [state, setState] = useState<T | undefined>(
    getInitialValue<T>(name) ?? defaultValue
  );

  const updateState = useCallback((value: T | undefined) => {
    setState(value);
    localStorage.setItem(name, JSON.stringify(value));
  }, []);

  return [state, updateState];
}
