/**
 * AccountPicker - Shared component for selecting accounts grouped by website.
 * Displays websites as collapsible sections with checkboxes for each account.
 */

import { Trans } from '@lingui/react/macro';
import {
    Badge,
    Box,
    Checkbox,
    Collapse,
    Group,
    Paper,
    Stack,
    Text,
    UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { AccountId } from '@postybirb/types';
import { SubmissionType } from '@postybirb/types';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import { useAccounts } from '../../../stores/account-store';
import type { AccountRecord, WebsiteRecord } from '../../../stores/records';
import {
    useFileWebsites,
    useMessageWebsites,
} from '../../../stores/website-store';
import './account-picker.css';

export interface AccountPickerProps {
  /** Submission type to filter websites by support */
  submissionType: SubmissionType;
  /** Currently selected account IDs */
  selectedAccountIds: AccountId[];
  /** Callback when selection changes */
  onSelectionChange: (accountIds: AccountId[]) => void;
}

interface WebsiteAccountGroupProps {
  website: WebsiteRecord;
  accounts: AccountRecord[];
  selectedAccountIds: AccountId[];
  onToggleAccount: (accountId: AccountId, checked: boolean) => void;
}

/**
 * A single website group with collapsible account list.
 */
function WebsiteAccountGroup({
  website,
  accounts,
  selectedAccountIds,
  onToggleAccount,
}: WebsiteAccountGroupProps) {
  const [expanded, { toggle }] = useDisclosure(false);

  const selectedCount = useMemo(
    () =>
      accounts.filter((acc) => selectedAccountIds.includes(acc.accountId))
        .length,
    [accounts, selectedAccountIds],
  );

  const loggedInCount = useMemo(
    () => accounts.filter((acc) => acc.isLoggedIn).length,
    [accounts],
  );

  return (
    <Paper withBorder radius="sm" p={0}>
      <UnstyledButton
        onClick={toggle}
        className="postybirb__account_picker_group_header"
      >
        <Group gap="xs" px="sm" py="xs" wrap="nowrap">
          {expanded ? (
            <IconChevronDown size={14} style={{ flexShrink: 0 }} />
          ) : (
            <IconChevronRight size={14} style={{ flexShrink: 0 }} />
          )}
          <Text size="sm" fw={500} style={{ flex: 1 }} truncate>
            {website.displayName}
          </Text>
          <Group gap={4}>
            {selectedCount > 0 && (
              <Badge size="xs" variant="filled" color="blue">
                {selectedCount}
              </Badge>
            )}
            <Badge
              size="xs"
              variant="light"

            >
              {loggedInCount}/{accounts.length}
            </Badge>
          </Group>
        </Group>
      </UnstyledButton>

      <Collapse in={expanded}>
        <Stack gap={2} pb="xs" px="xs">
          {accounts.map((account) => {
            const isSelected = selectedAccountIds.includes(account.accountId);
            const { isLoggedIn } = account;

            return (
              <Box
                key={account.id}
                className="postybirb__account_picker_account_row"
                px="sm"
                py={4}
              >
                <Checkbox
                  size="xs"
                  checked={isSelected}
                  disabled={!isLoggedIn}
                  onChange={(e) =>
                    onToggleAccount(account.accountId, e.currentTarget.checked)
                  }
                  label={
                    <Group gap="xs">
                      <Text size="sm">{account.name}</Text>
                      {account.username && (
                        <Text size="xs" c="dimmed">
                          ({account.username})
                        </Text>
                      )}
                      {!isLoggedIn && (
                        <Badge size="xs" variant="light" color="red">
                          <Trans>Not logged in</Trans>
                        </Badge>
                      )}
                    </Group>
                  }
                />
              </Box>
            );
          })}
        </Stack>
      </Collapse>
    </Paper>
  );
}

/**
 * Account picker component with websites grouped and expandable.
 */
export function AccountPicker({
  submissionType,
  selectedAccountIds,
  onSelectionChange,
}: AccountPickerProps) {
  const accounts = useAccounts();
  const fileWebsites = useFileWebsites();
  const messageWebsites = useMessageWebsites();

  // Group accounts by website - this must be done in useMemo to avoid infinite re-renders
  const accountsByWebsite = useMemo(() => {
    const grouped = new Map<string, AccountRecord[]>();
    accounts.forEach((account) => {
      const existing = grouped.get(account.website) ?? [];
      existing.push(account);
      grouped.set(account.website, existing);
    });
    return grouped;
  }, [accounts]);

  // Filter websites based on submission type
  const websites = useMemo(
    () =>
      submissionType === SubmissionType.FILE ? fileWebsites : messageWebsites,
    [submissionType, fileWebsites, messageWebsites],
  );

  // Toggle a single account
  const handleToggleAccount = useCallback(
    (accountId: AccountId, checked: boolean) => {
      if (checked) {
        onSelectionChange([...selectedAccountIds, accountId]);
      } else {
        onSelectionChange(selectedAccountIds.filter((id) => id !== accountId));
      }
    },
    [selectedAccountIds, onSelectionChange],
  );

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        <Trans>Websites</Trans>
      </Text>
      {websites.map((website) => {
        const acc = accountsByWebsite.get(website.id) ?? [];
        if (acc.length === 0) return null;

        return (
          <WebsiteAccountGroup
            key={website.id}
            website={website}
            accounts={acc}
            selectedAccountIds={selectedAccountIds}
            onToggleAccount={handleToggleAccount}
          />
        );
      })}
    </Stack>
  );
}
