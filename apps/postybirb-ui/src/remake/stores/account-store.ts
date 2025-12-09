/**
 * Account Store - Zustand store for account entities.
 */

import { ACCOUNT_UPDATES } from '@postybirb/socket-events';
import type { AccountId, IAccountDto } from '@postybirb/types';
import { useShallow } from 'zustand/react/shallow';
import accountApi from '../api/account.api';
import { createEntityStore, type EntityStore } from './create-entity-store';
import { AccountRecord } from './records';

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
export type AccountStore = EntityStore<AccountRecord>;

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select all accounts.
 */
export const useAccounts = () => useAccountStore((state) => state.records);

/**
 * Select accounts map for O(1) lookup.
 */
export const useAccountsMap = () => useAccountStore((state) => state.recordsMap);

/**
 * Select account loading state.
 */
export const useAccountsLoading = () =>
  useAccountStore(
    useShallow((state) => ({
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
  useAccountStore((state) => state.recordsMap.get(id));

/**
 * Select only logged-in accounts.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useLoggedInAccounts = () =>
  useAccountStore(
    useShallow((state) => state.records.filter((acc) => acc.isLoggedIn))
  );

/**
 * Select accounts grouped by website.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useAccountsByWebsite = () =>
  useAccountStore(
    useShallow((state) => {
      const grouped = new Map<string, AccountRecord[]>();
      state.records.forEach((account) => {
        const existing = grouped.get(account.website) ?? [];
        existing.push(account);
        grouped.set(account.website, existing);
      });
      return grouped;
    })
  );

/**
 * Select account store actions.
 */
export const useAccountActions = () =>
  useAccountStore(
    useShallow((state) => ({
      loadAll: state.loadAll,
      setRecords: state.setRecords,
      getById: state.getById,
      clear: state.clear,
    }))
  );
