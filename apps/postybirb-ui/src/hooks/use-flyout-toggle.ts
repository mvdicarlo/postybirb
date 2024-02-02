import { useCallback } from 'react';
import { GlobalState, useGlobalState } from '../global-state';

export function useFlyoutToggle(
  field: keyof GlobalState
): [boolean, (value?: boolean) => void] {
  const [globalState, setGlobalState] = useGlobalState();

  const toggle = useCallback(
    (value?: boolean) => {
      setGlobalState({
        ...globalState,
        [field]: value ?? !globalState[field],
      });
    },
    [field, globalState, setGlobalState]
  );

  return [globalState[field], toggle];
}
