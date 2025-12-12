/**
 * AccountSelectionForm - Form for selecting accounts grouped by website.
 * Each account checkbox expands to show website-specific form fields when selected.
 * API calls are made directly when accounts are checked/unchecked.
 */

import { Trans } from '@lingui/react/macro';
import {
    Badge,
    Box,
    Collapse,
    Group,
    Paper,
    Stack,
    Text,
    UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { SubmissionType, type WebsiteOptionsDto } from '@postybirb/types';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useAccounts } from '../../../../../stores/account-store';
import type {
    AccountRecord,
    WebsiteRecord,
} from '../../../../../stores/records';
import {
    useFileWebsites,
    useMessageWebsites,
} from '../../../../../stores/website-store';
import { useSubmissionEditCardContext } from '../context';
import { AccountOptionRow } from './account-option-row';
import './account-selection.css';

interface WebsiteAccountGroupProps {
  website: WebsiteRecord;
  accounts: AccountRecord[];
  /** Map of accountId -> WebsiteOptionsDto for quick lookup */
  optionsByAccount: Map<string, WebsiteOptionsDto>;
}

/**
 * A single website group with expandable account list.
 */
function WebsiteAccountGroup({
  website,
  accounts,
  optionsByAccount,
}: WebsiteAccountGroupProps) {
  const [expanded, { toggle }] = useDisclosure(false);

  // Count how many accounts are selected (have website options)
  const selectedCount = useMemo(
    () => accounts.filter((acc) => optionsByAccount.has(acc.accountId)).length,
    [accounts, optionsByAccount],
  );

  // Count logged in accounts
  const loggedInCount = useMemo(
    () => accounts.filter((acc) => acc.isLoggedIn).length,
    [accounts],
  );

  return (
    <Paper withBorder radius="sm" p={0}>
      <UnstyledButton
        onClick={toggle}
        className="postybirb__website_group_header"
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
            <Badge
              size="xs"
              variant="light"
              color={loggedInCount > 0 ? 'green' : 'gray'}
            >
              {selectedCount}/{accounts.length}
            </Badge>
          </Group>
        </Group>
      </UnstyledButton>

      <Collapse in={expanded}>
        <Box pb="xs">
          {accounts.map((account) => (
            <AccountOptionRow
              key={account.id}
              account={account}
              websiteOption={optionsByAccount.get(account.accountId) ?? null}
            />
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}

/**
 * Account selection form with websites grouped and expandable.
 * Each account selection triggers an API call to add/remove website options.
 */
export function AccountSelectionForm() {
  const { submission } = useSubmissionEditCardContext();
  const accounts = useAccounts();
  const fileWebsites = useFileWebsites();
  const messageWebsites = useMessageWebsites();

  // Build a map of accountId -> WebsiteOptionsDto for quick lookup
  const optionsByAccount = useMemo(() => {
    const map = new Map<string, WebsiteOptionsDto>();
    submission.options.forEach((opt) => {
      if (!opt.isDefault) {
        map.set(opt.accountId, opt);
      }
    });
    return map;
  }, [submission.options]);

  // Group accounts by website
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
      submission.type === SubmissionType.FILE ? fileWebsites : messageWebsites,
    [submission.type, fileWebsites, messageWebsites],
  );

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        <Trans>Websites</Trans>
      </Text>
      {websites.map((website) => {
        const websiteAccounts = accountsByWebsite.get(website.id) ?? [];
        if (websiteAccounts.length === 0) return null;

        return (
          <WebsiteAccountGroup
            key={website.id}
            website={website}
            accounts={websiteAccounts}
            optionsByAccount={optionsByAccount}
          />
        );
      })}
    </Stack>
  );
}
