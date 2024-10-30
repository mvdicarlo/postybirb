import { Trans } from '@lingui/macro';
import { Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTemplate } from '@tabler/icons-react';
import { useState } from 'react';
import websiteOptionsApi from '../../../../../api/website-options.api';
import TemplatePickerModal from '../../../../submission-templates/template-picker-modal/template-picker-modal';
import { SubmissionViewActionProps } from './submission-view-actions.props';

export function ApplySubmissionTemplateAction({
  selected,
  type,
}: SubmissionViewActionProps) {
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);

  return (
    <>
      <Button
        variant="transparent"
        c="var(--mantine-color-text)"
        disabled={selected.length === 0}
        leftSection={<IconTemplate />}
        onClick={() => setTemplatePickerVisible(true)}
      >
        <Trans>Apply Template</Trans>
      </Button>
      {templatePickerVisible ? (
        <TemplatePickerModal
          type={type}
          submissionId={selected.length === 1 ? selected[0].id : undefined}
          onClose={() => setTemplatePickerVisible(false)}
          onApply={(options) => {
            setTemplatePickerVisible(false);
            selected.forEach((submission) => {
              Promise.all(
                options.map((option) =>
                  websiteOptionsApi.create({
                    submission: submission.id,
                    account: option.account,
                    data: option.data,
                  }),
                ),
              )
                .then(() => {
                  notifications.show({
                    color: 'green',
                    title: submission.getDefaultOptions().data.title,
                    message: <Trans>Template applied</Trans>,
                  });
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
