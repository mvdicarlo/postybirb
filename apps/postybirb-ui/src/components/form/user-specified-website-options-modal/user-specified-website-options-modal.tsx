import { Trans, useLingui } from '@lingui/react/macro';
import { Button, Checkbox, Modal, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FormBuilderMetadata } from '@postybirb/form-builder';
import { AccountId, DynamicObject, SubmissionType } from '@postybirb/types';
import { useState } from 'react';
import userSpecifiedWebsiteOptionsApi from '../../../api/user-specified-website-options.api';
import { getTranslatedLabel } from '../fields/field-label';

type UserSpecifiedWebsiteOptionsSaveModalProps = {
  form: FormBuilderMetadata;
  values: Record<string, unknown>;
  accountId: AccountId;
  type: SubmissionType;
  opened: boolean;
  onClose: () => void;
};

export function UserSpecifiedWebsiteOptionsSaveModal(
  props: UserSpecifiedWebsiteOptionsSaveModalProps,
) {
  const { t } = useLingui();
  const [isSaving, setIsSaving] = useState(false);
  const { opened, type, accountId, values, form, onClose } = props;
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    {},
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Trans>Choose Fields</Trans>}
    >
      <Stack>
        {Object.entries(form)
          .sort((a, b) => a[1].label.localeCompare(b[1].label))
          .map(([key, field]) => (
            <Checkbox
              label={getTranslatedLabel(field, t)}
              key={key}
              checked={selectedFields[key] ?? false}
              onChange={(event) => {
                setSelectedFields({
                  ...selectedFields,
                  [key]: event.currentTarget.checked,
                });
              }}
            />
          ))}
        <Button
          loading={isSaving}
          fullWidth
          onClick={() => {
            setIsSaving(true);
            const copy: DynamicObject = JSON.parse(JSON.stringify(values));
            Object.entries(selectedFields).forEach(([key, isSelected]) => {
              if (!isSelected) {
                delete copy[key];
              }
            });

            userSpecifiedWebsiteOptionsApi
              .create({
                accountId,
                type,
                options: copy,
              })
              .then(() => {
                notifications.show({
                  message: (
                    <Trans context="default-options-saved">
                      Defaults saved
                    </Trans>
                  ),
                });
                onClose();
              })
              .catch((err) => {
                notifications.show({
                  title: <Trans>Failed to save defaults</Trans>,
                  message: err.message,
                  color: 'red',
                });
              })
              .finally(() => {
                setIsSaving(false);
              });
          }}
        >
          <Trans>Save</Trans>
        </Button>
      </Stack>
    </Modal>
  );
}
