/**
 * ApplyTemplateAction - Button to open template picker modal for a submission.
 */

import { Trans } from '@lingui/react/macro';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconTemplate } from '@tabler/icons-react';
import { useState } from 'react';
import { TemplatePickerModal } from '../../../../shared/template-picker';
import { useSubmissionEditCardContext } from '../context/submission-edit-card-context';

/**
 * Action button to apply a template to the current submission.
 */
export function ApplyTemplateAction() {
  const { submission, targetSubmissionIds } = useSubmissionEditCardContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  // Determine which submissions to apply to
  // In mass edit mode, use targetSubmissionIds; otherwise just this submission
  const targetIds = targetSubmissionIds?.length
    ? targetSubmissionIds
    : [submission.submissionId];

  return (
    <>
      <Tooltip label={<Trans>Apply template</Trans>}>
        <ActionIcon
          variant="subtle"
          size="sm"
          color="grape"
          onClick={handleClick}
        >
          <IconTemplate size={16} />
        </ActionIcon>
      </Tooltip>

      {isModalOpen && (
        <TemplatePickerModal
          submissionId={submission.submissionId}
          targetSubmissionIds={targetIds}
          type={submission.type}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
