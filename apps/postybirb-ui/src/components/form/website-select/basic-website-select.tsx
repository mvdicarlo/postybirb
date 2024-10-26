import { ComboboxItemGroup, MultiSelect } from '@mantine/core';
import { AccountId, IAccountDto } from '@postybirb/types';
import { useMemo, useState } from 'react';
import { useWebsites } from '../../../hooks/account/use-websites';

type WebsiteSelectProps = {
  selected: AccountId[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label: JSX.Element;
  onSelect(accounts: IAccountDto[]): void;
};

export function BasicWebsiteSelect(props: WebsiteSelectProps) {
  const { selected, size, label, onSelect } = props;
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

  const onCommitChanges = (
    newSelectedAccounts: IAccountDto[],
    force?: boolean,
  ) => {
    setSelectedAccounts(newSelectedAccounts);
    if (force) {
      onSelect(newSelectedAccounts);
      return;
    }
    if (isOpen) {
      return;
    }
    onSelect(newSelectedAccounts);
  };

  return (
    <MultiSelect
      size={size ?? 'sm'}
      label={label}
      clearable
      searchable
      data={options}
      defaultValue={selected}
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
