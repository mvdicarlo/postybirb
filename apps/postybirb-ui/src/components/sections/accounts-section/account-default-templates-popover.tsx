/**
 * AccountDefaultTemplatesPopover - Lets a user associate default submission
 * templates with an account. The selected template's option for this account
 * populates default form values for new submissions of that type.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Popover,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { SubmissionType } from '@postybirb/types';
import { IconTemplate } from '@tabler/icons-react';
import { useCallback } from 'react';
import accountApi from '../../../api/account.api';
import type { AccountRecord } from '../../../stores/records';
import { showUpdateErrorNotification } from '../../../utils/notifications';
import { TemplatePicker } from '../../shared/template-picker/template-picker';

/**
 * Popover action for selecting an account's default templates per submission
 * type. Only shows pickers for the submission types the website supports.
 */
export function AccountDefaultTemplatesPopover({
  account,
}: {
  account: AccountRecord;
}) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const supports = account.websiteInfo.supports ?? [];

  const updateTemplate = useCallback(
    async (
      field: 'defaultFileTemplateId' | 'defaultMessageTemplateId',
      templateId: string | null,
    ) => {
      try {
        await accountApi.update(account.id, {
          name: account.name,
          groups: account.groups,
          defaultFileTemplateId: account.defaultFileTemplateId,
          defaultMessageTemplateId: account.defaultMessageTemplateId,
          [field]: templateId,
        });
      } catch {
        showUpdateErrorNotification(account.name);
      }
    },
    [
      account.id,
      account.name,
      account.groups,
      account.defaultFileTemplateId,
      account.defaultMessageTemplateId,
    ],
  );

  if (supports.length === 0) {
    return null;
  }

  return (
    <Popover
      trapFocus
      returnFocus
      withArrow
      opened={opened}
      onChange={(isOpen) => {
        if (!isOpen) close();
      }}
      position="right"
      shadow="md"
      width={280}
    >
      <Popover.Target>
        <Tooltip label={<Trans>Default templates</Trans>}>
          <ActionIcon
            size="xs"
            variant="subtle"
            color="grape"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          >
            <IconTemplate size={14} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            <Trans>Default templates</Trans>
          </Text>
          <Text size="xs" c="dimmed">
            <Trans>
              Populate default field values for new submissions from a
              template's options for this account.
            </Trans>
          </Text>

          {supports.includes(SubmissionType.FILE) && (
            <TemplatePicker
              label={<Trans>File template</Trans>}
              type={SubmissionType.FILE}
              value={account.defaultFileTemplateId ?? undefined}
              comboboxProps={{ withinPortal: false }}
              onChange={(templateId) =>
                updateTemplate('defaultFileTemplateId', templateId)
              }
            />
          )}

          {supports.includes(SubmissionType.MESSAGE) && (
            <TemplatePicker
              label={<Trans>Message template</Trans>}
              type={SubmissionType.MESSAGE}
              value={account.defaultMessageTemplateId ?? undefined}
              comboboxProps={{ withinPortal: false }}
              onChange={(templateId) =>
                updateTemplate('defaultMessageTemplateId', templateId)
              }
            />
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
