import { IWebsiteInfoDto, WebsiteId } from '@postybirb/types';
import { useCallback, useMemo } from 'react';
import settingsApi from '../../api/settings.api';
import { AccountFilterState } from '../../models/app-states/account-filter-state';
import { DisplayableWebsiteLoginInfo } from '../../models/displayable-website-login-info';
import { useSettings } from '../../stores/use-settings';
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
  const { settingsId, settings } = useSettings();
  const currentSettings = settings;
  const filteredAccounts = useMemo(
    () => filterWebsites(websites, currentSettings.hiddenWebsites, filterState),
    [currentSettings.hiddenWebsites, filterState, websites]
  );

  const accounts = useMemo(
    () => websites.flatMap((website) => website.accounts),
    [websites]
  );

  const filteredWebsites = websites.filter(
    (website) => !settings.hiddenWebsites.includes(website.id)
  );

  const setHiddenWebsites = useCallback(
    (hiddenWebsites: WebsiteId[]) => {
      const updatedSettings = {
        ...settings,
        hiddenWebsites,
      };
      settingsApi.update(settingsId, { settings: updatedSettings });
    },
    [settings, settingsId]
  );

  return {
    accounts,
    filterState,
    filteredAccounts,
    filteredWebsites,
    isLoading,
    setFilterState,
    setHiddenWebsites,
    websites,
  };
}
