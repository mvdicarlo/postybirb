import { Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { Button, Checkbox, Modal, Stack, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FormBuilderMetadata } from '@postybirb/form-builder';
import { AccountId, DynamicObject, SubmissionType } from '@postybirb/types';
import { useState } from 'react';
import userSpecifiedWebsiteOptionsApi from '../../../api/user-specified-website-options.api';
import { getTranslatedLabel } from '../fields/field-label';

type UserSpecifiedWebsiteOptionsSaveModalProps = {
  form: FormBuilderMetadata<never>;
  values: Record<string, unknown>;
  account: AccountId;
  type: SubmissionType;
  opened: boolean;
  onClose: () => void;
};

export function UserSpecifiedWebsiteOptionsSaveModal(
  props: UserSpecifiedWebsiteOptionsSaveModalProps,
) {
  const { _ } = useLingui();
  const [isSaving, setIsSaving] = useState(false);
  const { opened, type, account, values, form, onClose } = props;
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    {},
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Title order={4}>
          <Trans>Choose Fields</Trans>
        </Title>
      }
    >
      <Stack>
        {Object.entries(form)
          .sort((a, b) => a[1].label.localeCompare(b[1].label))
          .map(([key, field]) => (
            <Checkbox
              label={getTranslatedLabel(field, _)}
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
                account,
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
