/**
 * Hook that provides bound action handlers for a specific account.
 * Eliminates the need to create wrapper callbacks in each AccountRow.
 */

import { useMemo } from 'react';
import { useAccountsContext } from '../context';

/**
 * Bound action handlers for a single account.
 */
export interface BoundAccountActions {
  /** Select this account */
  handleSelect: () => void;
  /** Delete this account */
  handleDelete: () => void;
  /** Reset this account (clear data/cookies) */
  handleReset: () => void;
  /** Request login for this account */
  handleLoginRequest: () => void;
  /** Whether this account is currently selected */
  isSelected: boolean;
}

/**
 * Hook that returns action handlers bound to a specific account ID.
 * Uses the AccountsContext internally, so must be used within an AccountsProvider.
 *
 * @param accountId - The ID of the account to bind actions to
 * @returns Object with bound action handlers and selection state
 *
 * @example
 * ```tsx
 * function MyAccountRow({ account }) {
 *   const { handleDelete, handleSelect, isSelected } = useAccountActions(account.id);
 *   return (
 *     <div className={isSelected ? 'selected' : ''}>
 *       <button onClick={handleSelect}>Select</button>
 *       <button onClick={handleDelete}>Delete</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAccountActions(accountId: string): BoundAccountActions {
  const context = useAccountsContext();

  return useMemo<BoundAccountActions>(
    () => ({
      handleSelect: () => context.onSelectAccount(accountId),
      handleDelete: () => context.onDeleteAccount(accountId),
      handleReset: () => context.onResetAccount(accountId),
      handleLoginRequest: () => context.onLoginRequest(accountId),
      isSelected: context.selectedAccountId === accountId,
    }),
    [context, accountId]
  );
}
