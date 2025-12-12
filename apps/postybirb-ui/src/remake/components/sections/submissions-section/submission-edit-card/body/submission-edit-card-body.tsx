/**
 * SubmissionEditCardBody - Body content of the submission edit card.
 */

import { Stack } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { ComponentErrorBoundary } from '../../../../error-boundary';
import { AccountSelectionForm } from '../account-selection';
import { useSubmissionEditCardContext } from '../context';
import { DefaultsForm } from '../defaults-form';
import { FileManagementStub } from '../file-management-stub';

/**
 * Body content of the submission edit card.
 * Contains file management (conditional), defaults form, and account selection form.
 */
export function SubmissionEditCardBody() {
  const { submission } = useSubmissionEditCardContext();

  const showFileManagement =
    submission.type === SubmissionType.FILE &&
    !submission.isMultiSubmission &&
    !submission.isTemplate;

  return (
    <Stack gap="md" p="md">
      {/* File Management Section (conditional) */}
      {showFileManagement && <FileManagementStub />}

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
