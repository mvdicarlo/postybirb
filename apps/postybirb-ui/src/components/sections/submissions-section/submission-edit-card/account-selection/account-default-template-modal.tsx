/**
 * AccountDefaultTemplateModal - A small action button (shown in the selected
 * accounts form header, next to the account status) that opens a modal letting
 * the user associate a default submission template with this account.
 *
 * The associated template's option for this same account is used to pre-fill
 * defaults when new submissions of this type are created. This replaces the
 * former "save as default" affordance with a more discoverable, explained flow.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
    ActionIcon,
    Alert,
    Button,
    Group,
    Modal,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { NULL_ACCOUNT_ID, SubmissionType } from '@postybirb/types';
import { IconInfoCircle, IconTemplate } from '@tabler/icons-react';
import { useCallback } from 'react';
import accountApi from '../../../../../api/account.api';
import { useAccount } from '../../../../../stores/entity/account-store';
import type {
    AccountRecord,
    SubmissionRecord,
} from '../../../../../stores/records';
import { showUpdateErrorNotification } from '../../../../../utils/notifications';
import { TemplatePicker } from '../../../../shared/template-picker/template-picker';

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

interface AccountDefaultTemplateModalProps {
  account: AccountRecord;
  submission: SubmissionRecord;
}

export function AccountDefaultTemplateModal({
  account: accountProp,
  submission,
}: AccountDefaultTemplateModalProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useLingui();

  // Prefer the live store record so the picker reflects updates immediately.
  const account = useAccount(accountProp.id) ?? accountProp;

  const submissionType = submission.type as SubmissionType;
  const fieldName = resolveFieldName(submissionType);

  const currentTemplateId = fieldName ? (account[fieldName] ?? null) : null;

  const updateTemplate = useCallback(
    async (templateId: string | null) => {
      if (!fieldName) return;
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

  // Not applicable for the default-account row or unsupported submission types.
  if (!fieldName || account.id === NULL_ACCOUNT_ID) {
    return null;
  }

  const hasDefault = Boolean(currentTemplateId);
  const isThisSubmissionDefault =
    submission.isTemplate && currentTemplateId === submission.id;

  return (
    <>
      <Tooltip
        label={
          hasDefault ? (
            <Trans>Default template set — click to change</Trans>
          ) : (
            <Trans>Set a default template for this account</Trans>
          )
        }
      >
        <ActionIcon
          size="xs"
          variant={hasDefault ? 'light' : 'subtle'}
          color="grape"
          aria-label={t`Default template`}
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          <IconTemplate size={14} />
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={opened}
        onClose={close}
        title={
          <Group gap="xs">
            <IconTemplate size={18} />
            <Text fw={600}>
              <Trans>Default template for {account.name}</Trans>
            </Text>
          </Group>
        }
        centered
        size="md"
      >
        <Stack gap="md">
          <Alert
            variant="light"
            color="blue"
            icon={<IconInfoCircle size={16} />}
          >
            <Text size="sm">
              {submissionType === SubmissionType.FILE ? (
                <Trans>
                  When you create a new file submission, the option for this
                  account will be pre-filled using the values from the template
                  you choose here.
                </Trans>
              ) : (
                <Trans>
                  When you create a new submission, the option for this account
                  will be pre-filled using the values from the template you
                  choose here.
                </Trans>
              )}{' '}
              <Trans>
                It only applies to new submissions — existing ones are not
                changed.
              </Trans>
            </Text>
          </Alert>

          <TemplatePicker
            label={<Trans>Template</Trans>}
            type={submissionType}
            value={currentTemplateId ?? undefined}
            comboboxProps={{ withinPortal: true }}
            onChange={updateTemplate}
          />

          {submission.isTemplate && (
            <Group justify="flex-end">
              <Tooltip
                label={
                  isThisSubmissionDefault ? (
                    <Trans>This template is already the default</Trans>
                  ) : (
                    <Trans>
                      Use the template you are currently editing as the default
                    </Trans>
                  )
                }
              >
                <Button
                  size="xs"
                  variant="light"
                  disabled={isThisSubmissionDefault}
                  onClick={() => updateTemplate(submission.id)}
                >
                  <Trans>Use this template</Trans>
                </Button>
              </Tooltip>
            </Group>
          )}
        </Stack>
      </Modal>
    </>
  );
}
