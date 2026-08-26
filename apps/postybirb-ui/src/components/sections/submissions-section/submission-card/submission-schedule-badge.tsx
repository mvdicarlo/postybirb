/**
 * SubmissionScheduleBadge - At-a-glance countdown to a submission's next post.
 */

import { useLingui } from '@lingui/react/macro';
import { Badge, Tooltip } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { useLocale } from '../../../../hooks';
import type { SubmissionRecord } from '../../../../stores/records';
import { getNextPostAt } from './utils';

interface SubmissionScheduleBadgeProps {
  submission: SubmissionRecord;
}

export function SubmissionScheduleBadge({
  submission,
}: SubmissionScheduleBadgeProps) {
  const { t } = useLingui();
  const { formatDateTime, formatRelativeTime } = useLocale();

  const nextPostAt = getNextPostAt(submission);
  if (!nextPostAt) return null;

  const isOverdue =
    submission.isScheduled && nextPostAt.getTime() < Date.now();

  let color = 'gray';
  if (isOverdue) {
    color = 'orange';
  } else if (submission.isScheduled) {
    color = 'blue';
  }

  const tooltip = submission.isScheduled
    ? formatDateTime(nextPostAt)
    : t`${formatDateTime(nextPostAt)} (scheduling is off)`;

  return (
    <Tooltip label={tooltip} withArrow>
      <Badge
        size="xs"
        variant="light"
        color={color}
        leftSection={<IconClock size={10} />}
        className="postybirb__submission__schedule_badge"
      >
        {formatRelativeTime(nextPostAt)}
      </Badge>
    </Tooltip>
  );
}
