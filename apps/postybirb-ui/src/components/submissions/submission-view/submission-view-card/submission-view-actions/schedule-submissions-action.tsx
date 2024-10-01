import { Trans } from '@lingui/macro';
import { Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ScheduleType } from '@postybirb/types';
import { IconCalendar } from '@tabler/icons-react';
import { useState } from 'react';
import submissionApi from '../../../../../api/submission.api';
import { SubmissionViewMultiSchedulerModal } from '../submission-view-multi-scheduler-modal';
import { SubmissionViewActionProps } from './submission-view-actions.props';

export function ScheduleSubmissionsActions({
  selected,
}: SubmissionViewActionProps) {
  const [multiScheduleVisible, setMultiScheduleVisible] = useState(false);
  return (
    <>
      <Button
        variant="transparent"
        c="var(--mantine-color-text)"
        disabled={selected.length === 0}
        leftSection={<IconCalendar />}
        onClick={() => setMultiScheduleVisible(true)}
      >
        <Trans>Schedule Many</Trans>
      </Button>
      {multiScheduleVisible ? (
        <SubmissionViewMultiSchedulerModal
          submissions={selected}
          onClose={() => setMultiScheduleVisible(false)}
          onApply={(s, isScheduled) => {
            setMultiScheduleVisible(false);
            s.forEach(({ submission, date }) => {
              submissionApi
                .update(submission.id, {
                  scheduleType: ScheduleType.SINGLE,
                  scheduledFor: date.toISOString(),
                  metadata: submission.metadata,
                  isScheduled: submission.isScheduled || isScheduled,
                })
                .catch((err) => {
                  notifications.show({
                    color: 'red',
                    title: submission.getDefaultOptions().data.title,
                    message: err.message,
                  });
                });
            });
          }}
        />
      ) : null}
    </>
  );
}
