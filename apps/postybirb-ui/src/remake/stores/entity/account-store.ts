/**
 * Account Store - Zustand store for account entities.
 */

import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import type { AccountId, IAccountDto } from '@postybirb/types';
import { useShallow } from 'zustand/react/shallow';
import accountApi from '../../api/account.api';
import { createEntityStore, type EntityStore } from '../create-entity-store';
import { AccountRecord } from '../records';

/**
 * Fetch all accounts from the API.
 */
const fetchAccounts = async (): Promise<IAccountDto[]> => {
  const response = await accountApi.getAll();
  return response.body;
};

/**
 * Account store instance.
 */
export const useAccountStore = createEntityStore<IAccountDto, AccountRecord>(
  fetchAccounts,
  (dto) => new AccountRecord(dto),
  {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    storeName: 'AccountStore',
    websocketEvent: ACCOUNT_UPDATES,
  }
);

/**
 * Type alias for the account store.
 */
export type AccountStoreState = EntityStore<AccountRecord>;

/** @deprecated Use AccountStoreState instead */
export type AccountStore = AccountStoreState;

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select all accounts.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useAccounts = (): AccountRecord[] =>
  useAccountStore(useShallow((state: AccountStoreState) => state.records));

/**
 * Select accounts map for O(1) lookup.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useAccountsMap = () =>
  useAccountStore(useShallow((state: AccountStoreState) => state.recordsMap));

/**
 * Select account loading state.
 */
export const useAccountsLoading = () =>
  useAccountStore(
    useShallow((state: AccountStoreState) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
    }))
  );

/**
 * Select a specific account by ID.
 */
export const useAccount = (id: AccountId) =>
  useAccountStore((state: AccountStoreState) => state.recordsMap.get(id));

/**
 * Select only logged-in accounts.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useLoggedInAccounts = (): AccountRecord[] =>
  useAccountStore(
    useShallow((state: AccountStoreState) =>
      state.records.filter((acc) => acc.isLoggedIn)
    )
  );

/**
 * Get accounts grouped by website ID.
 * This is a utility function, not a hook - use with useMemo in components.
 */
export const groupAccountsByWebsite = (
  accounts: AccountRecord[]
): Map<string, AccountRecord[]> => {
  const grouped = new Map<string, AccountRecord[]>();
  accounts.forEach((account) => {
    const existing = grouped.get(account.website) ?? [];
    existing.push(account);
    grouped.set(account.website, existing);
  });
  return grouped;
};

/**
 * Select account store actions.
 * No useShallow needed — action function refs are stable.
 */
export const useAccountActions = () =>
  useAccountStore(
    useShallow((state: AccountStoreState) => ({
      loadAll: state.loadAll,
      setRecords: state.setRecords,
      getById: state.getById,
      clear: state.clear,
    }))
  );
