import { useReducer } from 'react';

/**
 * Forces a re-render of the UI.
 * Not desirable, but sometimes needed based on implementation.
 */
export function useUpdateView() {
  const [, forceUpdate] = useReducer((x: number) => (x === 0 ? 1 : 0), 0);
  return forceUpdate;
}
