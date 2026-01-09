/**
 * SubmissionEditCardBody - Body content of the submission edit card.
 */

import { Stack } from '@mantine/core';
import { ISubmissionScheduleInfo, SubmissionType } from '@postybirb/types';
import { useCallback } from 'react';
import submissionApi from '../../../../../api/submission.api';
import { showUpdateErrorNotification } from '../../../../../utils/notifications';
import { ComponentErrorBoundary } from '../../../../error-boundary';
import { AccountSelectionForm } from '../account-selection';
import { useSubmissionEditCardContext } from '../context';
import { DefaultsForm } from '../defaults-form';
import { SubmissionFileManager } from '../file-management';
import { ScheduleForm } from '../schedule-form';

/**
 * Body content of the submission edit card.
 * Contains file management (conditional), schedule form, defaults form, and account selection form.
 */
export function SubmissionEditCardBody() {
  const { submission } = useSubmissionEditCardContext();

  const handleScheduleChange = useCallback(
    async (schedule: ISubmissionScheduleInfo, isScheduled: boolean) => {
      try {
        await submissionApi.update(submission.id, {
          isScheduled,
          ...schedule,
        });
      } catch {
        showUpdateErrorNotification();
      }
    },
    [submission.id],
  );

  const showFileManagement =
    submission.type === SubmissionType.FILE &&
    !submission.isMultiSubmission &&
    !submission.isTemplate;

  // Don't show schedule form for templates or multi-submissions
  const showScheduleForm = !submission.isTemplate && !submission.isMultiSubmission;

  return (
    <Stack gap="md" p="md">
      {/* File Management Section (conditional) */}
      {showFileManagement && (
        <ComponentErrorBoundary>
          <SubmissionFileManager />
        </ComponentErrorBoundary>
      )}

      {/* Schedule Form - configure when submission should be posted */}
      {showScheduleForm && (
        <ComponentErrorBoundary>
          <ScheduleForm
            schedule={submission.schedule}
            isScheduled={submission.isScheduled}
            onChange={handleScheduleChange}
          />
        </ComponentErrorBoundary>
      )}

      {/* Defaults Form - global options like title, description, tags */}
      <ComponentErrorBoundary>
        <DefaultsForm />
      </ComponentErrorBoundary>

      {/* Account Selection Form - with inline expandable options */}
      <ComponentErrorBoundary>
        <AccountSelectionForm />
      </ComponentErrorBoundary>
    </Stack>
  );
}
