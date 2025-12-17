/**
 * ApplyTemplateAction - Stub button for applying templates to submissions.
 * TODO: Implement template picker modal integration.
 */

import { Trans } from '@lingui/react/macro';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconTemplate } from '@tabler/icons-react';

/**
 * Action button to apply a template to the current submission.
 * Currently a placeholder - template picker modal to be implemented.
 */
export function ApplyTemplateAction() {
  // TODO: Implement template picker modal
  // - Open TemplatePicker modal on click
  // - Filter templates by submission type
  // - Call websiteOptionsApi.create() for each template option
  // - Show success/error notification

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Open template picker modal
  };

  return (
    <Tooltip label={<Trans>Apply template</Trans>}>
      <ActionIcon
        variant="subtle"
        size="sm"
        color="grape"
        onClick={handleClick}
        disabled // Disabled until implemented
      >
        <IconTemplate size={16} />
      </ActionIcon>
    </Tooltip>
  );
}
