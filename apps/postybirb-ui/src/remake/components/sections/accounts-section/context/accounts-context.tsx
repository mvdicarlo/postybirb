/**
 * AccountsContext - Provides account actions and selection state to child components.
 * Eliminates prop drilling by making handlers and state available via context.
 */

import { createContext, ReactNode, useContext, useMemo } from 'react';

/**
 * Shape of the accounts context value
 */
export interface AccountsContextValue {
  /** Currently selected account ID */
  selectedAccountId: string | null;
  /** Handle selecting an account */
  onSelectAccount: (accountId: string) => void;
  /** Handle deleting an account */
  onDeleteAccount: (accountId: string) => void;
  /** Handle resetting an account (clearing data/cookies) */
  onResetAccount: (accountId: string) => void;
  /** Handle login request for an account */
  onLoginRequest: (accountId: string) => void;
}

const AccountsContext = createContext<AccountsContextValue | null>(null);

/**
 * Hook to access the accounts context.
 * Must be used within an AccountsProvider.
 * @throws Error if used outside of AccountsProvider
 */
export function useAccountsContext(): AccountsContextValue {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error(
      // eslint-disable-next-line lingui/no-unlocalized-strings
      'useAccountsContext must be used within an AccountsProvider'
    );
  }
  return context;
}

/**
 * Optional hook that returns undefined if not within a provider.
 * Useful for components that can optionally use context.
 */
export function useAccountsContextOptional(): AccountsContextValue | null {
  return useContext(AccountsContext);
}

export interface AccountsProviderProps {
  children: ReactNode;
  /** Currently selected account ID */
  selectedAccountId: string | null;
  /** Selection handler */
  onSelectAccount: (accountId: string) => void;
  /** Delete handler */
  onDeleteAccount: (accountId: string) => void;
  /** Reset handler */
  onResetAccount: (accountId: string) => void;
  /** Login request handler */
  onLoginRequest: (accountId: string) => void;
}

/**
 * Provider component that supplies accounts context to children.
 * Wrap account lists and cards with this to enable context-based access.
 */
export function AccountsProvider({
  children,
  selectedAccountId,
  onSelectAccount,
  onDeleteAccount,
  onResetAccount,
  onLoginRequest,
}: AccountsProviderProps) {
  const value = useMemo<AccountsContextValue>(
    () => ({
      selectedAccountId,
      onSelectAccount,
      onDeleteAccount,
      onResetAccount,
      onLoginRequest,
    }),
    [
      selectedAccountId,
      onSelectAccount,
      onDeleteAccount,
      onResetAccount,
      onLoginRequest,
    ]
  );

  return (
    <AccountsContext.Provider value={value}>
      {children}
    </AccountsContext.Provider>
  );
}
