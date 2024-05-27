import { useCallback, useEffect, useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StateListener<T = any> = (value: T) => void;
const listeners = new Map<string, Set<StateListener>>();

function getLocalStorage<T>(key: string, initialValue: T): T {
  const item = localStorage.getItem(key);
  if (item) {
    try {
      return JSON.parse(item);
    } catch {
      return initialValue;
    }
  }
  return initialValue;
}

function setLocalStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  listeners.get(key)?.forEach((listener) => listener(value));
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(getLocalStorage(key, initialValue));

  const callbackRef = useRef<StateListener<T>>();
  const updateState = useCallback<StateListener<T>>(
    (v: T) => {
      if (v === value) return;
      setValue(v);
    },
    [value]
  );
  callbackRef.current = updateState;

  const publicSetState = useCallback(
    (v: T) => {
      setLocalStorage(key, v);
      listeners.get(key)?.forEach((listener) => {
        listener(v);
      });
    },
    [key]
  );

  useEffect(() => {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key)?.add(callbackRef.current!);

    return () => {
      listeners.get(key)?.delete(callbackRef.current!);
    };
  }, [key]);

  return [value, publicSetState];
}
