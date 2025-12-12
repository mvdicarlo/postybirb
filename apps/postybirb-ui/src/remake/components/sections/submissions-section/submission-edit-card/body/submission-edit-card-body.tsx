/**
 * SubmissionEditCardBody - Body content of the submission edit card.
 */

import { Stack } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { ComponentErrorBoundary } from '../../../../error-boundary';
import { AccountSelectionForm } from '../account-selection';
import { useSubmissionEditCardContext } from '../context';
import { FileManagementStub } from '../file-management-stub';

/**
 * Body content of the submission edit card.
 * Contains file management (conditional) and account selection form.
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

      {/* Account Selection Form - with inline expandable options */}
      <ComponentErrorBoundary>
        <AccountSelectionForm />
      </ComponentErrorBoundary>
    </Stack>
  );
}
