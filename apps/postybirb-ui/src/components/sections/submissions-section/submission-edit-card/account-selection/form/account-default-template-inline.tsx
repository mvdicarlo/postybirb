/**
 * AccountDefaultTemplateInline - In the submission edit form, allows the user
 * to associate a default submission template with the account being edited.
 * The associated template's options for this account are used to populate
 * defaults for new submissions of the same type.
 *
 * Mirrors AccountDefaultTemplatesPopover (accounts section) but inline in the
 * per-account edit form. Replaces the former "save as default" affordance.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Button, Group, Paper, Text, Tooltip } from '@mantine/core';
import { NULL_ACCOUNT_ID, SubmissionType } from '@postybirb/types';
import { IconTemplate } from '@tabler/icons-react';
import { useCallback } from 'react';
import accountApi from '../../../../../../api/account.api';
import { useAccount } from '../../../../../../stores/entity/account-store';
import { showUpdateErrorNotification } from '../../../../../../utils/notifications';
import { TemplatePicker } from '../../../../../shared/template-picker/template-picker';
import { useFormFieldsContext } from './form-fields-context';

type DefaultTemplateField =
  | 'defaultFileTemplateId'
  | 'defaultMessageTemplateId';

function resolveFieldName(
  type: SubmissionType,
): DefaultTemplateField | undefined {
  if (type === SubmissionType.FILE) return 'defaultFileTemplateId';
  if (type === SubmissionType.MESSAGE) return 'defaultMessageTemplateId';
  return undefined;
}

export function AccountDefaultTemplateInline() {
  const { option, submission } = useFormFieldsContext();
  const account = useAccount(option.accountId);

  const submissionType = submission.type as SubmissionType;
  const fieldName = resolveFieldName(submissionType);

  const currentTemplateId = account
    ? (account[fieldName as DefaultTemplateField] ?? null)
    : null;

  const updateTemplate = useCallback(
    async (templateId: string | null) => {
      if (!account || !fieldName) return;
      try {
        await accountApi.update(account.id, {
          name: account.name,
          groups: account.groups,
          defaultFileTemplateId: account.defaultFileTemplateId,
          defaultMessageTemplateId: account.defaultMessageTemplateId,
          [fieldName]: templateId,
        });
      } catch {
        showUpdateErrorNotification(account.name);
      }
    },
    [account, fieldName],
  );

  // Hide for the default-account row (no real account) and unsupported types.
  if (
    !account ||
    !fieldName ||
    option.accountId === NULL_ACCOUNT_ID
  ) {
    return null;
  }

  const isThisSubmissionDefault =
    submission.isTemplate && currentTemplateId === submission.id;

  return (
    <Paper withBorder px="xs" py={6} radius="sm" mt={2} mb="xs">
      <Group gap="xs" align="flex-end" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <TemplatePicker
            label={
              <Group gap={4} align="center">
                <IconTemplate size={12} />
                <Text size="xs" fw={500}>
                  <Trans>Default template for this account</Trans>
                </Text>
              </Group>
            }
            type={submissionType}
            value={currentTemplateId ?? undefined}
            comboboxProps={{ withinPortal: false }}
            onChange={updateTemplate}
          />
        </Box>
        {submission.isTemplate && (
          <Tooltip
            label={
              isThisSubmissionDefault ? (
                <Trans>This template is already the default</Trans>
              ) : (
                <Trans>Use this template as the default for this account</Trans>
              )
            }
          >
            <Button
              size="xs"
              variant="light"
              disabled={isThisSubmissionDefault}
              onClick={() => updateTemplate(submission.id)}
            >
              <Trans>Use this</Trans>
            </Button>
          </Tooltip>
        )}
      </Group>
    </Paper>
  );
}
