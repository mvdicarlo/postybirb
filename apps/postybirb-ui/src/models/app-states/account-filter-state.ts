export type AccountFilterState = {
  showHiddenWebsites: boolean;
  showWebsitesWithoutAccounts: boolean;
};

export const DEFAULT_ACCOUNT_FILTER_STATE: AccountFilterState = {
  showHiddenWebsites: true,
  showWebsitesWithoutAccounts: true,
};
