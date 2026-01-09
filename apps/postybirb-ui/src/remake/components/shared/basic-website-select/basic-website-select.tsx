import { ComboboxItemGroup, MultiSelect } from '@mantine/core';
import { AccountId, IAccountDto } from '@postybirb/types';
import { useEffect, useMemo, useState } from 'react';
import {
  groupAccountsByWebsite,
  useAccounts,
} from '../../../stores/entity/account-store';
import { AccountRecord } from '../../../stores/records';

type WebsiteSelectProps = {
  selected: AccountId[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label: JSX.Element;
  onSelect(accounts: IAccountDto[]): void;
};

export function BasicWebsiteSelect(props: WebsiteSelectProps) {
  const { selected, size, label, onSelect } = props;
  const accounts = useAccounts();
  const [value, setValue] = useState<string[]>(selected);

  // Memoize grouped accounts to avoid re-creating Map on every render
  const accountsByWebsite = useMemo(
    () => groupAccountsByWebsite(accounts),
    [accounts],
  );

  // Sync value with selected prop when it changes externally
  useEffect(() => {
    setValue(selected);
  }, [selected]);

  // Build options grouped by website display name
  // Format: "[WebsiteName] AccountName" for tags
  const options: ComboboxItemGroup[] = useMemo(() => {
    const groups: ComboboxItemGroup[] = [];

    accountsByWebsite.forEach(
      (websiteAccounts: AccountRecord[], _websiteId: string) => {
        if (websiteAccounts.length === 0) return;

        // Get the display name from the first account's websiteInfo
        const displayName = websiteAccounts[0].websiteDisplayName;

        groups.push({
          group: displayName,
          items: websiteAccounts.map((account: AccountRecord) => ({
            // Show "[WebsiteName] AccountName" format in the pills/tags
            label: `[${displayName}] ${account.name}`,
            value: account.id,
          })),
        });
      },
    );

    // Sort groups alphabetically
    groups.sort((a, b) => a.group.localeCompare(b.group));

    return groups;
  }, [accountsByWebsite]);

  const mapRecordToDto = (record: AccountRecord): IAccountDto => ({
    id: record.id,
    name: record.name,
    website: record.website,
    groups: record.groups,
    state: record.state,
    data: record.data,
    websiteInfo: record.websiteInfo,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });

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
        const selectedAccounts = accounts
          .filter((a: AccountRecord) => newValue.includes(a.id))
          .map(mapRecordToDto);
        onSelect(selectedAccounts);
      }}
    />
  );
}
