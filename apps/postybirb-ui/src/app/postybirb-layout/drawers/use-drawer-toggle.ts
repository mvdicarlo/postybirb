import { useCallback } from 'react';
import { DrawerGlobalState, useDrawerGlobalState } from './drawer-global-state';

export function useDrawerToggle(
  field: keyof DrawerGlobalState,
): [boolean, (value?: boolean) => void] {
  const [globalState, setGlobalState] = useDrawerGlobalState();

  const toggle = useCallback(
    (value?: boolean) => {
      const existingValue = globalState[field];
      if (value === existingValue) {
        return;
      }
      const newState: DrawerGlobalState = {
        ...globalState,
        [field]: value ?? !globalState[field],
      };
      if (newState[field]) {
        for (const key in newState) {
          if (key !== field) {
            newState[key as keyof DrawerGlobalState] = false;
          }
        }
      }
      setGlobalState(newState);
    },
    [field, globalState, setGlobalState],
  );

  return [globalState[field], toggle];
}
