import { IWebsiteInfoDto } from '@postybirb/types';
import { useMemo } from 'react';
import { AccountFilterState } from '../../models/app-states/account-filter-state';
import { DisplayableWebsiteLoginInfo } from '../../models/displayable-website-login-info';
import { SettingsStore } from '../../stores/settings.store';
import { useStore } from '../../stores/use-store';
import { WebsiteStore } from '../../stores/website.store';
import { useAccountFilters } from './use-accounts-filters';

export function filterWebsites(
  availableWebsites: IWebsiteInfoDto[],
  hiddenWebsites: string[],
  filters: AccountFilterState
): DisplayableWebsiteLoginInfo[] {
  let filteredWebsites = availableWebsites;
  if (!filters.showHiddenWebsites) {
    filteredWebsites = filteredWebsites.filter(
      (w) => !hiddenWebsites.includes(w.id)
    );
  }

  if (!filters.showWebsitesWithoutAccounts) {
    filteredWebsites = filteredWebsites.filter((w) => w.accounts.length);
  }

  return filteredWebsites.map((w) => ({
    ...w,
    isHidden: !hiddenWebsites.includes(w.id),
  }));
}

export function useWebsites() {
  const { filterState, setFilterState } = useAccountFilters();
  const { state: websites, isLoading } = useStore(WebsiteStore);
  const { state: settings } = useStore(SettingsStore);
  const currentSettings = settings[0].settings;
  const filteredAccounts = useMemo(
    () => filterWebsites(websites, currentSettings.hiddenWebsites, filterState),
    [currentSettings.hiddenWebsites, filterState, websites]
  );

  const accounts = useMemo(
    () => websites.flatMap((website) => website.accounts),
    [websites]
  );

  return {
    accounts,
    filteredAccounts,
    filterState,
    setFilterState,
    websites,
    isLoading,
  };
}
