/**
 * SubmissionEditCardBody - Body content of the submission edit card.
 */

import { Box, Stack } from '@mantine/core';
import {
    ISubmissionScheduleInfo,
    SubmissionId,
    SubmissionType,
} from '@postybirb/types';
import { useCallback } from 'react';
import submissionApi from '../../../../../api/submission.api';
import { showUpdateErrorNotification } from '../../../../../utils/notifications';
import { ComponentErrorBoundary } from '../../../../error-boundary';
import { AccountSelect, SelectedAccountsForms } from '../account-selection';
import { useSubmissionEditCardContext } from '../context';
import { DefaultsForm } from '../defaults-form';
import { DependsOnForm } from '../depends-on-form';
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

  const handleDependsOnChange = useCallback(
    async (dependsOn: SubmissionId[]) => {
      try {
        await submissionApi.update(submission.id, {
          metadata: { ...submission.metadata, dependsOn },
        });
      } catch {
        showUpdateErrorNotification();
      }
    },
    [submission.id, submission.metadata],
  );

  const showFileManagement =
    submission.type === SubmissionType.FILE &&
    !submission.isMultiSubmission &&
    !submission.isTemplate;

  // Don't show schedule form for templates or multi-submissions
  const showScheduleForm = !submission.isTemplate && !submission.isMultiSubmission;

  // Dependencies only make sense for real, postable submissions.
  const showDependsOnForm =
    !submission.isTemplate && !submission.isMultiSubmission;

  return (
    <Stack gap="md" p="md">
      {/* File Management Section (conditional) */}
      {showFileManagement && (
        <ComponentErrorBoundary>
          <Box data-tour-id="edit-card-files">
            <SubmissionFileManager />
          </Box>
        </ComponentErrorBoundary>
      )}

      {/* Schedule Form - configure when submission should be posted */}
      {showScheduleForm && (
        <ComponentErrorBoundary>
          <Box data-tour-id="edit-card-schedule">
            <ScheduleForm
              schedule={submission.schedule}
              isScheduled={submission.isScheduled}
              disabled={submission.isArchived}
              onChange={handleScheduleChange}
            />
          </Box>
        </ComponentErrorBoundary>
      )}

      {/* Depends On - hold this submission until its dependencies finish posting */}
      {showDependsOnForm && (
        <ComponentErrorBoundary>
          <Box data-tour-id="edit-card-depends-on">
            <DependsOnForm
              submissionId={submission.id}
              type={submission.type}
              value={submission.metadata.dependsOn ?? []}
              disabled={submission.isArchived}
              onChange={handleDependsOnChange}
            />
          </Box>
        </ComponentErrorBoundary>
      )}

      {/* Defaults Form - global options like title, description, tags */}
      <ComponentErrorBoundary>
        <Box data-tour-id="edit-card-defaults">
          <DefaultsForm />
        </Box>
      </ComponentErrorBoundary>

      {/* Account Selection - dropdown for selecting accounts */}
      <ComponentErrorBoundary>
        <Box data-tour-id="edit-card-accounts">
          <AccountSelect />
        </Box>
      </ComponentErrorBoundary>

      {/* Website Options - per-website forms for selected accounts */}
      <ComponentErrorBoundary>
        <Box data-tour-id="edit-card-website-forms">
          <SelectedAccountsForms />
        </Box>
      </ComponentErrorBoundary>
    </Stack>
  );
}
