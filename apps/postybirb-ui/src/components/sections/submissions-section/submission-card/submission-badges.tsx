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
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArchive,
  IconCalendar,
  IconCircleCheck,
  IconGlobe,
  IconLoader,
  IconX,
} from '@tabler/icons-react';
import { useLocale } from '../../../../hooks';
import { ValidationTranslation } from '../../../../i18n/validation-translation';
import type { SubmissionRecord } from '../../../../stores/records';

interface SubmissionBadgesProps {
  /** The submission record to display badges for */
  submission: SubmissionRecord;
}

/**
 * Displays one stable status badge. Additional state is available without
 * changing the card's dimensions.
 */
export function SubmissionBadges({
  submission,
}: SubmissionBadgesProps) {
  const { t } = useLingui();
  const { formatDateTime } = useLocale();
  const statuses = [
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

          {validationsWithIssues.length > 0 && (
            <Stack gap={6}>
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
              <Group gap={7} wrap="nowrap">
                <IconCalendar size={14} />
                <Text size="xs">
                  {submission.scheduledDate ? (
                    formatDateTime(submission.scheduledDate)
                  ) : (
                    <Trans>Recurring schedule configured</Trans>
                  )}
                </Text>
              </Group>
            </>
          )}
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
