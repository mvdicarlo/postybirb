/**
 * SubmissionBadges - Status badges for submissions.
 */

import { Trans } from '@lingui/react/macro';
import { Badge, Group, Tooltip } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import {
  IconAlertTriangle,
  IconCalendar,
  IconCircleCheck,
  IconGlobe,
  IconLoader,
  IconX,
} from '@tabler/icons-react';
import { useLocale } from '../../../../hooks';
import type { SubmissionRecord } from '../../../../stores/records';

interface SubmissionBadgesProps {
  /** The submission record to display badges for */
  submission: SubmissionRecord;
  /** Type of submission (FILE or MESSAGE) - used to conditionally show file count */
  submissionType: SubmissionType;
}

/**
 * Displays status badges for a submission.
 * Shows scheduled, queued, errors, warnings, ready, no websites, and file count badges.
 */
export function SubmissionBadges({
  submission,
  submissionType,
}: SubmissionBadgesProps) {
  const { formatDateTime } = useLocale();

  return (
    <Group gap={4}>
      {/* Queued badge */}
      {submission.isQueued && (
        <Badge
          size="xs"
          variant="light"
          color="cyan"
          leftSection={<IconLoader size={10} />}
        >
          <Trans>Queued</Trans>
        </Badge>
      )}

      {/* Validation errors */}
      {submission.hasErrors && (
        <Tooltip label={<Trans>Has validation errors</Trans>}>
          <Badge
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconX size={10} />}
          >
            <Trans>Errors</Trans>
          </Badge>
        </Tooltip>
      )}

      {/* Validation warnings */}
      {submission.hasWarnings && !submission.hasErrors && (
        <Tooltip label={<Trans>Has validation warnings</Trans>}>
          <Badge
            size="xs"
            variant="light"
            color="yellow"
            leftSection={<IconAlertTriangle size={10} />}
          >
            <Trans>Warnings</Trans>
          </Badge>
        </Tooltip>
      )}

      {/* Valid badge (no errors/warnings) */}
      {!submission.hasErrors &&
        !submission.hasWarnings &&
        submission.hasWebsiteOptions && (
          <Tooltip label={<Trans>Ready to post</Trans>}>
            <Badge
              size="xs"
              variant="light"
              color="green"
              leftSection={<IconCircleCheck size={10} />}
            >
              <Trans>Ready</Trans>
            </Badge>
          </Tooltip>
        )}

      {/* No websites badge */}
      {!submission.hasWebsiteOptions && (
        <Tooltip label={<Trans>No websites selected</Trans>}>
          <Badge
            size="xs"
            variant="light"
            color="gray"
            leftSection={<IconGlobe size={10} />}
          >
            <Trans>No websites</Trans>
          </Badge>
        </Tooltip>
      )}
    </Group>
  );
}
