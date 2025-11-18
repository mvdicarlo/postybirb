import { Trans } from "@lingui/react/macro";
import {
  ComboboxItemGroup,
  Group,
  MantineSize,
  MultiSelect,
} from '@mantine/core';
import { IAccountDto, NULL_ACCOUNT_ID, SubmissionType } from '@postybirb/types';
import { IconCheck } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useWebsites } from '../../../hooks/account/use-websites';
import { SubmissionDto } from '../../../models/dtos/submission.dto';

type WebsiteSelectProps = {
  submission: SubmissionDto;
  size?: MantineSize;
  onSelect(accounts: IAccountDto[]): void;
};

export function WebsiteSelect(props: WebsiteSelectProps) {
  const { submission, size, onSelect } = props;
  const { accounts, filteredAccounts } = useWebsites();
  const [selectedAccounts, setSelectedAccounts] = useState<IAccountDto[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const options: ComboboxItemGroup[] = useMemo(
    () =>
      filteredAccounts
        .filter((website) => {
          if (submission.type === SubmissionType.MESSAGE) {
            return website.supportsMessage;
          }
          if (submission.type === SubmissionType.FILE) {
            return website.supportsFile;
          }
          return false;
        })
        .map((website) => ({
          group: website.displayName,
          items: website.accounts.map((account) => ({
            label: `[${website.displayName}] ${account.name}`,
            value: account.id,
          })),
        })),
    [filteredAccounts, submission.type],
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
      size={size}
      defaultValue={submission.options
        .filter((o) => o.accountId !== NULL_ACCOUNT_ID)
        .map((o) => o.accountId)}
      label={<Trans>Websites</Trans>}
      onChange={(value) => {
        onCommitChanges(accounts.filter((a) => value.includes(a.id)));
      }}
      onDropdownOpen={() => setIsOpen(true)}
      onDropdownClose={() => {
        onCommitChanges(selectedAccounts, true);
        setIsOpen(false);
      }}
      renderOption={(item) => {
        const label = item.option.label.split('] ')[1];
        return (
          <Group>
            {item.checked ? <IconCheck /> : null}
            {label}
          </Group>
        );
      }}
    />
  );
}
