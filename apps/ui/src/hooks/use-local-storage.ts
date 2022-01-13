import { useCallback, useState } from 'react';

function getInitialValue<T>(name: string): T | undefined {
  try {
    return JSON.parse(localStorage.getItem(name) as string) as T;
  } catch (err) {
    console.error(err);
  }

  return undefined;
}

export default function useLocalStorage<T>(name: string, defaultValue?: T) {
  const [state, setState] = useState<T | undefined>(
    getInitialValue<T>(name) ?? defaultValue
  );

  const updateState = useCallback((value: T | undefined) => {
    setState(value);
    localStorage.setItem(name, JSON.stringify(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [state, updateState];
}
