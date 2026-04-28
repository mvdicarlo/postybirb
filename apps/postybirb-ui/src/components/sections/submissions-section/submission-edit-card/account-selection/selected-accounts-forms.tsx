/**
 * SelectedAccountsForms - Displays website-specific option forms for all selected accounts.
 * Groups selected accounts by website, each in a collapsible section (collapsed by default).
 * Each account within a group shows its form fields via FormFieldsProvider + SectionLayout.
 */

import { Trans } from '@lingui/react/macro';
import {
  Badge,
  Box,
  Collapse,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { EntityId, WebsiteOptionsDto } from '@postybirb/types';
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCircleFilled,
  IconLoader,
  IconX,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useAccounts } from '../../../../../stores/entity/account-store';
import { useWebsites } from '../../../../../stores/entity/website-store';
import type {
  AccountRecord,
  WebsiteRecord,
} from '../../../../../stores/records';
import { ComponentErrorBoundary } from '../../../../error-boundary';
import {
  type AccountPostStatus,
  type AccountPostStatusEntry,
  getAccountPostStatusMap,
} from '../../submission-history';
import { useSubmissionEditCardContext } from '../context';
import './account-selection.css';
import { FormFieldsProvider, SectionLayout } from './form';

interface WebsiteFormGroupProps {
  website: WebsiteRecord;
  options: Array<{
    option: WebsiteOptionsDto;
    account: AccountRecord;
    hasErrors: boolean;
    hasWarnings: boolean;
  }>;
  accountStatusMap: Map<EntityId, AccountPostStatusEntry>;
}

/**
 * Get the icon for an individual account post status.
 */
function AccountStatusIcon({ status, errors }: { status: AccountPostStatus; errors: string[] }) {
  switch (status) {
    case 'success':
      return (
        <Tooltip label={<Trans>Posted successfully</Trans>} withArrow>
          <IconCheck size={14} color="var(--mantine-color-green-6)" style={{ flexShrink: 0 }} />
        </Tooltip>
      );
    case 'failed':
      return (
        <Tooltip
          label={errors.length > 0 ? errors.join(' | ') : <Trans>Post failed</Trans>}
          multiline
          w={300}
          withArrow
        >
          <IconX size={14} color="var(--mantine-color-red-6)" style={{ flexShrink: 0 }} />
        </Tooltip>
      );
    case 'running':
      return (
        <Tooltip label={<Trans>Posting in progress</Trans>} withArrow>
          <IconLoader size={14} color="var(--mantine-color-blue-6)" style={{ flexShrink: 0 }} />
        </Tooltip>
      );
    case 'rate-limited':
      return (
        <Tooltip label={<Trans>Waiting (rate limit)</Trans>} withArrow>
          <IconLoader size={14} color="var(--mantine-color-orange-6)" style={{ flexShrink: 0 }} />
        </Tooltip>
      );
    default:
      return null;
  }
}

/**
 * Compute the aggregate status icon for a website group.
 */
function GroupStatusIcon({ options, accountStatusMap }: {
  options: WebsiteFormGroupProps['options'];
  accountStatusMap: Map<EntityId, AccountPostStatusEntry>;
}) {
  const statuses = options
    .map(({ option }) => accountStatusMap.get(option.accountId))
    .filter((s): s is AccountPostStatusEntry => s != null);

  if (statuses.length === 0) return null;

  const hasAnyFailed = statuses.some((s) => s.status === 'failed');
  const hasAnyRunning = statuses.some((s) => s.status === 'running');
  const allSuccess = statuses.every((s) => s.status === 'success');

  if (allSuccess) {
    return (
      <Tooltip label={<Trans>All posted successfully</Trans>} withArrow>
        <IconCheck size={14} color="var(--mantine-color-green-6)" style={{ flexShrink: 0 }} />
      </Tooltip>
    );
  }

  if (hasAnyFailed) {
    const failedErrors = statuses
      .filter((s) => s.status === 'failed')
      .flatMap((s) => s.errors);
    return (
      <Tooltip
        label={failedErrors.length > 0 ? failedErrors.join(' | ') : <Trans>Some posts failed</Trans>}
        multiline
        w={300}
        withArrow
      >
        <IconX size={14} color="var(--mantine-color-red-6)" style={{ flexShrink: 0 }} />
      </Tooltip>
    );
  }

  if (hasAnyRunning) {
    return (
      <Tooltip label={<Trans>Posting in progress</Trans>} withArrow>
        <IconLoader size={14} color="var(--mantine-color-blue-6)" style={{ flexShrink: 0 }} />
      </Tooltip>
    );
  }

  return null;
}

/**
 * A single website group with collapsible form sections.
 * Collapsed by default. Shows error/warning counts in header.
 */
function WebsiteFormGroup({ website, options, accountStatusMap }: WebsiteFormGroupProps) {
  const { submission } = useSubmissionEditCardContext();
  const [expanded, { toggle }] = useDisclosure(false);

  const { errorCount, warningCount } = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    options.forEach(({ hasErrors, hasWarnings }) => {
      if (hasErrors) errors++;
      if (hasWarnings) warnings++;
    });
    return { errorCount: errors, warningCount: warnings };
  }, [options]);

  return (
    <Paper withBorder radius="sm" p={0}>
      <UnstyledButton
        onClick={toggle}
        className="postybirb__website_group_header"
      >
        <Group
          gap="xs"
          px="sm"
          py="xs"
          wrap="nowrap"
          style={{
            backgroundColor: 'var(--mantine-primary-color-light)',
          }}
        >
          {expanded ? (
            <IconChevronDown size={14} style={{ flexShrink: 0 }} />
          ) : (
            <IconChevronRight size={14} style={{ flexShrink: 0 }} />
          )}
          <Text size="sm" fw={500} style={{ flex: 1 }} truncate>
            {website.displayName}
          </Text>
          <Group gap={4}>
            <GroupStatusIcon options={options} accountStatusMap={accountStatusMap} />
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
            <Badge size="xs" variant="light">
              {options.length}{' '}
              {options.length === 1 ? (
                <Trans>account</Trans>
              ) : (
                <Trans>accounts</Trans>
              )}
            </Badge>
          </Group>
        </Group>
      </UnstyledButton>

      <Collapse in={expanded}>
        <Stack gap="xs" p="sm">
          {options.map(({ option, account, hasErrors, hasWarnings }, index) => (
            <Box key={option.id}>
              {/* Divider between accounts in same group */}
              {index > 0 && <Divider mb="xs" />}

              {/* Account sub-header */}
              <Group gap="xs" mb="xs">
                <IconCircleFilled
                  size={8}
                  color={
                    account.isLoggedIn
                      ? 'var(--mantine-color-green-filled)'
                      : account.isPending
                        ? 'var(--mantine-color-yellow-filled)'
                        : 'var(--mantine-color-red-filled)'
                  }
                />
                <Text size="sm" fw={500}>
                  {account.name}
                </Text>
                {account.username && (
                  <Text size="xs" c="dimmed">
                    ({account.username})
                  </Text>
                )}
                {(() => {
                  const accountStatus = accountStatusMap.get(option.accountId);
                  if (accountStatus) {
                    return (
                      <AccountStatusIcon
                        status={accountStatus.status}
                        errors={accountStatus.errors}
                      />
                    );
                  }
                  return null;
                })()}
                {hasErrors && (
                  <Badge size="xs" variant="light" color="red">
                    <Trans>Error</Trans>
                  </Badge>
                )}
                {hasWarnings && (
                  <Badge size="xs" variant="light" color="yellow">
                    <Trans>Warning</Trans>
                  </Badge>
                )}
              </Group>

              {/* Website-specific form */}
              <ComponentErrorBoundary>
                <FormFieldsProvider option={option} submission={submission}>
                  <SectionLayout key={option.id} />
                </FormFieldsProvider>
              </ComponentErrorBoundary>
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Paper>
  );
}

/**
 * Renders all selected accounts' forms, grouped by website in collapsible sections.
 */
export function SelectedAccountsForms() {
  const { submission } = useSubmissionEditCardContext();
  const accounts = useAccounts();
  const websites = useWebsites();

  // Compute per-account post status from latest post record
  // Skip for templates and multi-edit cards (they never have post history)
  const accountStatusMap = useMemo(() => {
    if (submission.isTemplate || submission.isMultiSubmission) {
      return new Map<EntityId, AccountPostStatusEntry>();
    }
    return getAccountPostStatusMap(submission);
  }, [submission]);

  // Map accountId -> AccountRecord
  const accountById = useMemo(() => {
    const map = new Map<string, AccountRecord>();
    accounts.forEach((acc) => map.set(acc.accountId, acc));
    return map;
  }, [accounts]);

  // Map websiteId -> WebsiteRecord
  const websiteById = useMemo(() => {
    const map = new Map<string, WebsiteRecord>();
    websites.forEach((w) => map.set(w.id, w));
    return map;
  }, [websites]);

  // Build validation lookup: optionId -> { hasErrors, hasWarnings }
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

  // Get non-default options and group by website
  const websiteGroups = useMemo(() => {
    const nonDefaultOptions = submission.options.filter(
      (opt) => !opt.isDefault,
    );

    // Group by website (via the account's website field)
    const grouped = new Map<
      string,
      Array<{
        option: WebsiteOptionsDto;
        account: AccountRecord;
        hasErrors: boolean;
        hasWarnings: boolean;
      }>
    >();

    nonDefaultOptions.forEach((option) => {
      const account = accountById.get(option.accountId);
      if (!account) return;

      const websiteId = account.website;
      const validation = validationsByOptionId.get(option.id);
      const entry = {
        option,
        account,
        hasErrors: validation?.hasErrors ?? false,
        hasWarnings: validation?.hasWarnings ?? false,
      };

      const existing = grouped.get(websiteId) ?? [];
      existing.push(entry);
      grouped.set(websiteId, existing);
    });

    // Convert to array with website records, preserving website display order
    const groups: Array<{
      website: WebsiteRecord;
      options: Array<{
        option: WebsiteOptionsDto;
        account: AccountRecord;
        hasErrors: boolean;
        hasWarnings: boolean;
      }>;
    }> = [];

    grouped.forEach((options, websiteId) => {
      const website = websiteById.get(websiteId);
      if (website) {
        groups.push({ website, options });
      }
    });

    // Sort by website display name
    groups.sort((a, b) =>
      a.website.displayName.localeCompare(b.website.displayName),
    );

    return groups;
  }, [submission.options, accountById, websiteById, validationsByOptionId]);

  if (websiteGroups.length === 0) {
    return null;
  }

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        <Trans>Website Options</Trans>
      </Text>
      {websiteGroups.map(({ website, options }) => (
        <WebsiteFormGroup
          key={website.id}
          website={website}
          options={options}
          accountStatusMap={accountStatusMap}
        />
      ))}
    </Stack>
  );
}
