import { createGlobalState, useLocalStorage } from 'react-use';
import {
  AccountFilterState,
  DEFAULT_ACCOUNT_FILTER_STATE,
} from '../../models/app-states/account-filter-state';

const KEY = 'account-filters';

function loadFromLocalStorage(): AccountFilterState {
  const state = localStorage.getItem(KEY);
  let filters = DEFAULT_ACCOUNT_FILTER_STATE;
  if (state) {
    try {
      filters = { ...filters, ...JSON.parse(state) };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }
  return filters;
}

const useGlobalAccountFilterState = createGlobalState<AccountFilterState>(
  loadFromLocalStorage(),
);

export function useAccountFilters() {
  const [filterState, setFilterState] = useGlobalAccountFilterState();
  const [, setFilterStorageState] = useLocalStorage(KEY, filterState);
  const updateFilterState = (stateUpdate: AccountFilterState) => {
    setFilterState(stateUpdate);
    setFilterStorageState(stateUpdate);
  };
  return { filterState, setFilterState: updateFilterState };
}
