/**
 * FieldCopyButton - Copy to clipboard button for text fields.
 */

import { Trans } from '@lingui/react/macro';
import { ActionIcon, CopyButton, rem, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';

export function FieldCopyButton({ value }: { value: string | undefined }) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  return (
    <CopyButton value={value?.trim() || ''} timeout={2000}>
      {({ copied, copy }) => (
        <Tooltip
          label={
            copied ? <Trans>Copied!</Trans> : <Trans>Copy to clipboard</Trans>
          }
          withArrow
          position="right"
        >
          <ActionIcon
            color={copied ? 'teal' : 'gray'}
            variant="subtle"
            onClick={copy}
          >
            {copied ? (
              <IconCheck style={{ width: rem(16) }} />
            ) : (
              <IconCopy style={{ width: rem(16) }} />
            )}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
}
