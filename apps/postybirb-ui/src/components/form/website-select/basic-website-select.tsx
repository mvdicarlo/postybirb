import { ComboboxItemGroup, MultiSelect } from '@mantine/core';
import { AccountId, IAccountDto } from '@postybirb/types';
import { useEffect, useMemo, useState } from 'react';
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
  const [value, setValue] = useState<string[]>(selected);

  // Sync value with selected prop when it changes externally
  useEffect(() => {
    setValue(selected);
  }, [selected]);

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

  return (
    <MultiSelect
      className="postybirb__b-website-select"
      size={size ?? 'sm'}
      label={label}
      clearable
      searchable
      data={options}
      value={value}
      onChange={(newValue) => {
        setValue(newValue);
        const selectedAccounts = accounts.filter((a) => newValue.includes(a.id));
        onSelect(selectedAccounts);
      }}
    />
  );
}
