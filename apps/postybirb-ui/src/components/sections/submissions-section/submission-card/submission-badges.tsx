/**
 * SubmissionBadges - Bounded status summary with details on hover.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  Badge,
  Divider,
  Group,
  HoverCard,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import type { EntityId, IUnitOfWork } from '@postybirb/types';
import { UnitOfWorkState } from '@postybirb/types';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArchive,
  IconBan,
  IconCalendar,
  IconCircleCheck,
  IconClockPause,
  IconGitBranch,
  IconGlobe,
  IconLoader,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { useMemo, type ReactNode } from 'react';
import { useLocale } from '../../../../hooks';
import { ValidationTranslation } from '../../../../i18n/validation-translation';
import { useAccountsMap, useSubmissionsMap } from '../../../../stores';
import type { SubmissionRecord } from '../../../../stores/records';
import { getUnitErrorMessages } from '../submission-history/history-utils';
import { getNextPostAt } from './utils';

interface SubmissionBadgesProps {
  /** The submission record to display badges for */
  submission: SubmissionRecord;
}

/** Most actionable state first, so a partially settled account reports the state worth acting on. */
const UNIT_STATE_PRIORITY = [
  UnitOfWorkState.FAILED,
  UnitOfWorkState.EXECUTING,
  UnitOfWorkState.VALIDATING,
  UnitOfWorkState.RATE_LIMITED,
  UnitOfWorkState.PENDING,
  UnitOfWorkState.NEW,
  UnitOfWorkState.SUCCEEDED,
  UnitOfWorkState.CANCELLED,
];

function pickRepresentativeUnit(units: IUnitOfWork[]): IUnitOfWork {
  for (const state of UNIT_STATE_PRIORITY) {
    const match = units.find((unit) => unit.state === state);
    if (match) return match;
  }
  return units[0];
}

function UnitStateBadge({ state }: { state: UnitOfWorkState }) {
  switch (state) {
    case UnitOfWorkState.SUCCEEDED:
      return (
        <Badge size="xs" variant="light" color="green">
          <Trans>Posted</Trans>
        </Badge>
      );
    case UnitOfWorkState.FAILED:
      return (
        <Badge size="xs" variant="light" color="red">
          <Trans>Failed</Trans>
        </Badge>
      );
    case UnitOfWorkState.EXECUTING:
      return (
        <Badge size="xs" variant="light" color="blue">
          <Trans>Posting</Trans>
        </Badge>
      );
    case UnitOfWorkState.VALIDATING:
      return (
        <Badge size="xs" variant="light" color="blue">
          <Trans>Validating</Trans>
        </Badge>
      );
    case UnitOfWorkState.RATE_LIMITED:
      return (
        <Badge size="xs" variant="light" color="yellow">
          <Trans>Rate limited</Trans>
        </Badge>
      );
    case UnitOfWorkState.CANCELLED:
      return (
        <Badge size="xs" variant="light" color="gray">
          <Trans>Cancelled</Trans>
        </Badge>
      );
    default:
      return (
        <Badge size="xs" variant="light" color="gray">
          <Trans>Waiting</Trans>
        </Badge>
      );
  }
}

/**
 * Displays one stable status badge. Additional state is available without
 * changing the card's dimensions.
 */
export function SubmissionBadges({ submission }: SubmissionBadgesProps) {
  const { t } = useLingui();
  const { formatDateTime, formatRelativeTime } = useLocale();
  const submissionsMap = useSubmissionsMap();
  const accountsMap = useAccountsMap();

  const pendingDependencies = useMemo(() => {
    if (submission.dependsOn.length === 0) return [];
    return submission.dependsOn
      .map((dependencyId) => {
        const dependency = submissionsMap.get(dependencyId);
        return {
          id: dependencyId,
          title: dependency?.title || dependencyId,
          isCompleted: dependency?.isPostSuccessful ?? false,
        };
      })
      .filter((dependency) => !dependency.isCompleted);
  }, [submission.dependsOn, submissionsMap]);

  const accountProgress = useMemo(() => {
    const entries: {
      accountId: EntityId;
      website: string;
      name: string;
      state: UnitOfWorkState;
      rateLimitedUntil?: string;
      errors: string[];
      attempts: number;
    }[] = [];

    for (const [accountId, units] of submission.unitsOfWorkByAccount) {
      const activeUnits = units.filter((unit) => !unit.evicted);
      if (activeUnits.length === 0) continue;

      const account = accountsMap.get(accountId);
      const representative = pickRepresentativeUnit(activeUnits);
      entries.push({
        accountId,
        website: account?.websiteDisplayName ?? '',
        name: account?.name ?? accountId,
        state: representative.state,
        rateLimitedUntil: representative.rateLimitedUntil ?? undefined,
        errors: [...new Set(activeUnits.flatMap(getUnitErrorMessages))],
        attempts: units.length,
      });
    }

    return entries;
  }, [submission.unitsOfWorkByAccount, accountsMap]);

  const nextPostAt = useMemo(() => getNextPostAt(submission), [submission]);

  const { unitStats } = submission;
  const isAwaitingDependencies =
    (submission.isQueued || submission.isPosting) &&
    !submission.hasRunningUnits &&
    pendingDependencies.length > 0;
  const websiteCount = submission.options.filter(
    (option) => !option.isDefault,
  ).length;

  const statuses = [
    submission.hasRunningUnits
      ? {
          key: 'posting',
          color: 'blue',
          icon: <IconSend size={10} />,
          label: <Trans>Posting</Trans>,
        }
      : null,
    submission.hasRateLimitedUnits
      ? {
          key: 'rate-limited',
          color: 'yellow',
          icon: <IconClockPause size={10} />,
          label: <Trans>Rate limited</Trans>,
        }
      : null,
    isAwaitingDependencies
      ? {
          key: 'awaiting-dependencies',
          color: 'grape',
          icon: <IconGitBranch size={10} />,
          label: <Trans>Dependencies</Trans>,
        }
      : null,
    submission.isPostCancelled
      ? {
          key: 'post-cancelled',
          color: 'gray',
          icon: <IconBan size={10} />,
          label: <Trans>Post cancelled</Trans>,
        }
      : null,
    submission.hasFailedUnits
      ? {
          key: 'post-failed',
          color: 'red',
          icon: <IconAlertCircle size={10} />,
          label: <Trans>Post failed</Trans>,
        }
      : null,
    submission.isArchived
      ? {
          key: 'archived',
          color: 'gray',
          icon: <IconArchive size={10} />,
          label: <Trans>Archived</Trans>,
        }
      : null,
    submission.isQueued
      ? {
          key: 'queued',
          color: 'cyan',
          icon: <IconLoader size={10} />,
          label: <Trans>Queued</Trans>,
        }
      : null,
    submission.hasErrors
      ? {
          key: 'errors',
          color: 'red',
          icon: <IconX size={10} />,
          label: <Trans>Validation errors</Trans>,
        }
      : null,
    submission.hasWarnings
      ? {
          key: 'warnings',
          color: 'yellow',
          icon: <IconAlertTriangle size={10} />,
          label: <Trans>Validation warnings</Trans>,
        }
      : null,
    submission.isScheduled
      ? {
          key: 'scheduled',
          color: 'blue',
          icon: <IconCalendar size={10} />,
          label: <Trans>Scheduled</Trans>,
        }
      : null,
    !submission.hasWebsiteOptions
      ? {
          key: 'websites',
          color: 'gray',
          icon: <IconGlobe size={10} />,
          label: <Trans>No websites</Trans>,
        }
      : null,
    !submission.hasErrors &&
    !submission.hasWarnings &&
    submission.hasWebsiteOptions
      ? {
          key: 'ready',
          color: 'green',
          icon: <IconCircleCheck size={10} />,
          label: <Trans>Ready</Trans>,
        }
      : null,
  ].filter((status) => status !== null);
  const primaryStatus = statuses[0];
  const statusHints: Record<string, ReactNode> = {
    posting: <Trans>Currently sending this submission to its websites.</Trans>,
    'rate-limited': (
      <Trans>
        A website asked PostyBirb to slow down. The remaining posts retry
        automatically.
      </Trans>
    ),
    'awaiting-dependencies': (
      <Trans>
        This submission posts once every submission it depends on has finished.
      </Trans>
    ),
    'post-cancelled': (
      <Trans>The last post attempt was cancelled before it finished.</Trans>
    ),
    'post-failed': (
      <Trans>
        Some websites did not accept this submission. Retry them from the post
        history.
      </Trans>
    ),
    archived: (
      <Trans>Posting finished, so this submission moved to the archive.</Trans>
    ),
    queued: <Trans>Waiting in the post queue for its turn.</Trans>,
    errors: <Trans>Fix the validation errors below before posting.</Trans>,
    warnings: (
      <Trans>
        This submission can post, but some websites may change the result.
      </Trans>
    ),
    scheduled: <Trans>This submission posts automatically when scheduled.</Trans>,
    websites: <Trans>Add at least one website before posting.</Trans>,
    ready: (
      <Trans>Ready to post to {websiteCount} website(s).</Trans>
    ),
  };
  const statusHint = statusHints[primaryStatus.key];
  const errorCount = submission.validations.reduce(
    (total, validation) => total + validation.errors.length,
    0,
  );
  const warningCount = submission.validations.reduce(
    (total, validation) => total + validation.warnings.length,
    0,
  );
  const validationsWithIssues = submission.validations.filter(
    (validation) =>
      validation.errors.length > 0 || validation.warnings.length > 0,
  );

  return (
    <HoverCard
      width={320}
      position="right-start"
      withinPortal
      shadow="md"
      openDelay={250}
      closeDelay={120}
    >
      <HoverCard.Target>
        <UnstyledButton
          className="postybirb__submission__status_button"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          aria-label={t`View submission status details`}
        >
          <Badge
            size="xs"
            variant="light"
            color={primaryStatus.color}
            leftSection={primaryStatus.icon}
            className="postybirb__submission__status_badge"
          >
            {primaryStatus.label}
          </Badge>
        </UnstyledButton>
      </HoverCard.Target>
      <HoverCard.Dropdown
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        className="postybirb__submission__status_details"
      >
        <Stack gap="sm">
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Text size="sm" fw={600}>
              <Trans>Submission status</Trans>
            </Text>
            <Badge
              size="sm"
              variant="light"
              color={primaryStatus.color}
              leftSection={primaryStatus.icon}
            >
              {primaryStatus.label}
            </Badge>
          </Group>

          {statuses.length > 1 && (
            <Group gap={5}>
              {statuses.slice(1).map((status) => (
                <Badge
                  key={status.key}
                  size="xs"
                  variant="light"
                  color={status.color}
                  leftSection={status.icon}
                >
                  {status.label}
                </Badge>
              ))}
            </Group>
          )}

          {statusHint && (
            <Text size="xs" c="dimmed" lh={1.35}>
              {statusHint}
            </Text>
          )}

          {unitStats.total > 0 && (
            <>
              <Divider />
              <Stack gap={6}>
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <Text size="xs" fw={600}>
                    <Trans>Post progress</Trans>
                  </Text>
                  <Text size="xs" c="dimmed">
                    <Trans>
                      {unitStats.succeeded} of {unitStats.total} done
                    </Trans>
                  </Text>
                </Group>
                <Group gap={6}>
                  {unitStats.running > 0 && (
                    <Badge size="xs" variant="light" color="blue">
                      <Trans>{unitStats.running} in progress</Trans>
                    </Badge>
                  )}
                  {unitStats.pending > 0 && (
                    <Badge size="xs" variant="light" color="gray">
                      <Trans>{unitStats.pending} waiting</Trans>
                    </Badge>
                  )}
                  {unitStats.rateLimited > 0 && (
                    <Badge size="xs" variant="light" color="yellow">
                      <Trans>{unitStats.rateLimited} rate limited</Trans>
                    </Badge>
                  )}
                  {unitStats.failed > 0 && (
                    <Badge size="xs" variant="light" color="red">
                      <Trans>{unitStats.failed} failed</Trans>
                    </Badge>
                  )}
                  {unitStats.cancelled > 0 && (
                    <Badge size="xs" variant="light" color="gray">
                      <Trans>{unitStats.cancelled} cancelled</Trans>
                    </Badge>
                  )}
                </Group>
                <ScrollArea.Autosize mah={180} type="auto" offsetScrollbars>
                  <Stack gap={7} pr={4}>
                    {accountProgress.map((entry) => (
                      <Stack key={entry.accountId} gap={2}>
                        <Group
                          justify="space-between"
                          gap="xs"
                          wrap="nowrap"
                          align="flex-start"
                        >
                          <Text size="xs" lineClamp={1}>
                            {entry.website ? `${entry.website} · ` : ''}
                            {entry.name}
                          </Text>
                          <UnitStateBadge state={entry.state} />
                        </Group>
                        {entry.state === UnitOfWorkState.RATE_LIMITED &&
                          entry.rateLimitedUntil && (
                            <Text size="xs" c="dimmed">
                              <Trans>
                                Retries{' '}
                                {formatRelativeTime(entry.rateLimitedUntil)}
                              </Trans>
                            </Text>
                          )}
                        {entry.attempts > 1 && (
                          <Text size="xs" c="dimmed">
                            <Trans>{entry.attempts} attempts</Trans>
                          </Text>
                        )}
                        {entry.errors.map((error) => (
                          <Text key={error} size="xs" c="red" lineClamp={2}>
                            {error}
                          </Text>
                        ))}
                      </Stack>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              </Stack>
            </>
          )}

          {isAwaitingDependencies && (
            <>
              <Divider />
              <Stack gap={5}>
                <Group gap={7} wrap="nowrap">
                  <IconGitBranch size={14} />
                  <Text size="xs" fw={600}>
                    <Trans>Waiting for these submissions to finish</Trans>
                  </Text>
                </Group>
                {pendingDependencies.map((dependency) => (
                  <Text key={dependency.id} size="xs" c="dimmed" lineClamp={1}>
                    {dependency.title}
                  </Text>
                ))}
              </Stack>
            </>
          )}

          {validationsWithIssues.length > 0 && (
            <Stack gap={6}>
              <Divider />
              <Group gap={6}>
                {errorCount > 0 && (
                  <Badge size="xs" variant="light" color="red">
                    <Trans>{errorCount} errors</Trans>
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge size="xs" variant="light" color="yellow">
                    <Trans>{warningCount} warnings</Trans>
                  </Badge>
                )}
              </Group>
              <ScrollArea.Autosize mah={220} type="auto" offsetScrollbars>
                <Stack gap="sm" pr={4}>
                  {validationsWithIssues.map((validation) => (
                    <Stack key={validation.id} gap={5}>
                      <Text size="xs" fw={600} c="dimmed">
                        {validation.account.name}
                      </Text>
                      {validation.errors.map((error, index) => (
                        <Group
                          // eslint-disable-next-line react/no-array-index-key
                          key={`error-${error.id}-${index}`}
                          gap={7}
                          wrap="nowrap"
                          align="flex-start"
                        >
                          <ThemeIcon
                            size={18}
                            radius="xl"
                            color="red"
                            variant="light"
                          >
                            <IconAlertCircle size={12} />
                          </ThemeIcon>
                          <Text component="div" size="xs" lh={1.35}>
                            <ValidationTranslation
                              id={error.id}
                              values={error.values}
                            />
                          </Text>
                        </Group>
                      ))}
                      {validation.warnings.map((warning, index) => (
                        <Group
                          // eslint-disable-next-line react/no-array-index-key
                          key={`warning-${warning.id}-${index}`}
                          gap={7}
                          wrap="nowrap"
                          align="flex-start"
                        >
                          <ThemeIcon
                            size={18}
                            radius="xl"
                            color="yellow"
                            variant="light"
                          >
                            <IconAlertTriangle size={12} />
                          </ThemeIcon>
                          <Text component="div" size="xs" lh={1.35}>
                            <ValidationTranslation
                              id={warning.id}
                              values={warning.values}
                            />
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            </Stack>
          )}

          {submission.hasScheduleTime && (
            <>
              <Divider />
              <Stack gap={4}>
                <Group gap={7} wrap="nowrap">
                  <IconCalendar size={14} />
                  <Text size="xs">
                    {nextPostAt ? (
                      formatDateTime(nextPostAt)
                    ) : (
                      <Trans>Recurring schedule configured</Trans>
                    )}
                  </Text>
                </Group>
                {nextPostAt && (
                  <Text size="xs" c="dimmed">
                    {submission.isScheduled ? (
                      <Trans>Posts {formatRelativeTime(nextPostAt)}</Trans>
                    ) : (
                      <Trans>
                        Scheduling is off, so this will not post on its own.
                      </Trans>
                    )}
                  </Text>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
