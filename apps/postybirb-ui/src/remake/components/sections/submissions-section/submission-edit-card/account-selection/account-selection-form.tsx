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
  /** Map of websiteOptionId -> validation result */
  validationsByOptionId: Map<
    string,
    { hasErrors: boolean; hasWarnings: boolean }
  >;
}

/**
 * A single website group with expandable account list.
 */
function WebsiteAccountGroup({
  website,
  accounts,
  optionsByAccount,
  validationsByOptionId,
}: WebsiteAccountGroupProps) {
  const [expanded, { toggle, open }] = useDisclosure(false);

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

  // Count errors and warnings in this website group
  const { errorCount, warningCount } = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    accounts.forEach((acc) => {
      const option = optionsByAccount.get(acc.accountId);
      if (option) {
        const validation = validationsByOptionId.get(option.id);
        if (validation?.hasErrors) errors++;
        if (validation?.hasWarnings) warnings++;
      }
    });
    return { errorCount: errors, warningCount: warnings };
  }, [accounts, optionsByAccount, validationsByOptionId]);

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
            {errorCount > 0 && (
              <Badge size="xs" variant="light" color="red">
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge size="xs" variant="light" color="yellow">
                {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
              </Badge>
            )}
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
          {accounts.map((account) => {
            const option = optionsByAccount.get(account.accountId);
            const validation = option
              ? validationsByOptionId.get(option.id)
              : undefined;
            return (
              <AccountOptionRow
                key={account.id}
                account={account}
                websiteOption={option ?? null}
                hasErrors={validation?.hasErrors ?? false}
                hasWarnings={validation?.hasWarnings ?? false}
              />
            );
          })}
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

  // Build a map of websiteOptionId -> validation status
  const validationsByOptionId = useMemo(() => {
    const map = new Map<string, { hasErrors: boolean; hasWarnings: boolean }>();
    submission.validations.forEach((validation) => {
      map.set(validation.id, {
        hasErrors: Boolean(validation.errors && validation.errors.length > 0),
        hasWarnings: Boolean(
          validation.warnings && validation.warnings.length > 0,
        ),
      });
    });
    return map;
  }, [submission.validations]);

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
            validationsByOptionId={validationsByOptionId}
          />
        );
      })}
    </Stack>
  );
}
