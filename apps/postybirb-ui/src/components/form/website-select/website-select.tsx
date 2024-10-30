import { Trans } from '@lingui/macro';
import { ComboboxItemGroup, MultiSelect } from '@mantine/core';
import { IAccountDto, NULL_ACCOUNT_ID } from '@postybirb/types';
import { useMemo, useState } from 'react';
import { useWebsites } from '../../../hooks/account/use-websites';
import { SubmissionDto } from '../../../models/dtos/submission.dto';

type WebsiteSelectProps = {
  submission: SubmissionDto;
  onSelect(accounts: IAccountDto[]): void;
};

export function WebsiteSelect(props: WebsiteSelectProps) {
  const { submission, onSelect } = props;
  const { accounts, filteredAccounts } = useWebsites();
  const [selectedAccounts, setSelectedAccounts] = useState<IAccountDto[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const options: ComboboxItemGroup[] = useMemo(
    () =>
      filteredAccounts.map((website) => ({
        group: website.displayName,
        items: website.accounts.map((account) => ({
          label: account.name,
          value: account.id,
        })),
      })),
    [filteredAccounts],
  );

  const onCommitChanges = (selected: IAccountDto[], force?: boolean) => {
    setSelectedAccounts(selected);
    if (force) {
      onSelect(selected);
      return;
    }
    if (isOpen) {
      return;
    }
    onSelect(selected);
  };

  return (
    <MultiSelect
      clearable
      searchable
      data={options}
      defaultValue={submission.options
        .filter((o) => o.account !== NULL_ACCOUNT_ID)
        .map((o) => o.account)}
      label={<Trans>Websites</Trans>}
      onChange={(value) => {
        onCommitChanges(accounts.filter((a) => value.includes(a.id)));
      }}
      onDropdownOpen={() => setIsOpen(true)}
      onDropdownClose={() => {
        onCommitChanges(selectedAccounts, true);
        setIsOpen(false);
      }}
    />
  );
}
