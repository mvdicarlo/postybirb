/**
 * Hook to derive IAccountDto[] from submission website options.
 * Excludes the default account (NULL_ACCOUNT_ID) and maps AccountRecords to DTOs.
 */

import { IAccountDto, NULL_ACCOUNT_ID } from '@postybirb/types';
import { useMemo } from 'react';
import { useAccountsMap } from '../../../../../stores/entity/account-store';
import { useSubmissionEditCardContext } from '../context';

export function useSubmissionAccounts(): IAccountDto[] {
  const { submission } = useSubmissionEditCardContext();
  const accountsMap = useAccountsMap();

  return useMemo(() => {
    const accountIds = submission.options
      .map((option) => option.account?.id)
      .filter((id): id is string => !!id && id !== NULL_ACCOUNT_ID);

    return accountIds
      .map((id) => {
        const record = accountsMap.get(id);
        if (!record) return null;
        return {
          id: record.id,
          name: record.name,
          website: record.website,
          groups: record.groups,
          state: record.state,
          data: record.data,
          websiteInfo: record.websiteInfo,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        } as IAccountDto;
      })
      .filter((acc): acc is IAccountDto => acc !== null);
  }, [submission.options, accountsMap]);
}
