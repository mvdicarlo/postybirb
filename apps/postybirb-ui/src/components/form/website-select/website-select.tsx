import { Trans } from "@lingui/react/macro";
import {
  ComboboxItemGroup,
  Group,
  MantineSize,
  MultiSelect,
} from '@mantine/core';
import { IAccountDto, NULL_ACCOUNT_ID, SubmissionType } from '@postybirb/types';
import { IconCheck } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
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
  const [value, setValue] = useState<string[]>(
    submission.options
      .filter((o) => o.accountId !== NULL_ACCOUNT_ID)
      .map((o) => o.accountId)
  );

  // Sync value with submission.options when it changes externally
  useEffect(() => {
    const newValue = submission.options
      .filter((o) => o.accountId !== NULL_ACCOUNT_ID)
      .map((o) => o.accountId);
    setValue(newValue);
  }, [submission.options]);

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

  return (
    <MultiSelect
      clearable
      searchable
      data={options}
      size={size}
      value={value}
      label={<Trans>Websites</Trans>}
      onChange={(newValue) => {
        setValue(newValue);
        const selectedAccounts = accounts.filter((a) => newValue.includes(a.id));
        onSelect(selectedAccounts);
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
