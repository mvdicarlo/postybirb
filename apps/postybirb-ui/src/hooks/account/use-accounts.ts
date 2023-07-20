import { createGlobalState, useLocalStorage } from 'react-use';
import { useStore } from '../../stores/use-store';
import { AccountStore } from '../../stores/account.store';
import { SettingsStore } from '../../stores/settings.store';
import { ISettingsOptions } from '@postybirb/types';

export type AccountFilterState = {
    showHiddenAccounts: boolean;
};

const DEFAULT_STATE: AccountFilterState = {
    showHiddenAccounts: true
};

const KEY = 'account-filters';

function loadFromLocalStorage(): AccountFilterState {
    const state = localStorage.getItem(KEY);
    let filters = DEFAULT_STATE;
    if (state) {
        try {
            filters = { ...filters, ...JSON.parse(state) }
        } catch (err) {
            console.error(err);
        }
    }
    return filters;
}

const useGlobalAccountFilterState = createGlobalState<AccountFilterState>(loadFromLocalStorage());

export function useAccountFilters() {
    const [filterState, setFilterState] = useGlobalAccountFilterState();
    const [, setFilterStorageState] = useLocalStorage(KEY, filterState);
    const updateFilterState = (stateUpdate: AccountFilterState) => {
        setFilterState(stateUpdate);
        setFilterStorageState(stateUpdate);
    };
    return { filterState, setFilterState: updateFilterState };
}

export function useAccounts() {
    const { filterState, setFilterState } = useAccountFilters();
    const { state, isLoading } = useStore(AccountStore);
    const { state: settings } = useStore(SettingsStore);
    const currentSettings: ISettingsOptions = settings.length ? settings[0].settings : { hiddenWebsites: [] };

    const filteredAccounts = state
        .filter(account => currentSettings.hiddenWebsites.includes(account.website));

    return { filteredAccounts, filterState, setFilterState, allAccounts: state, isLoading };
}