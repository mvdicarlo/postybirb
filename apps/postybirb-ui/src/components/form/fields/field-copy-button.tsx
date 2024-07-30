import { Trans } from '@lingui/macro';
import { ActionIcon, CopyButton, Tooltip, rem } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';

export function FieldCopyButton({ value }: { value: string | undefined }) {
  return (
    <CopyButton value={value?.trim() || ''} timeout={2000}>
      {({ copied, copy }) => (
        <Tooltip
          label={copied ? <Trans>Copied</Trans> : <Trans>Copy</Trans>}
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