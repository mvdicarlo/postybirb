/**
 * DependsOnForm - lets a submission declare other submissions it depends on.
 * A dependent submission is held back in the post queue until every submission
 * listed here has finished posting successfully (e.g. comic page ordering).
 */

import { Trans } from '@lingui/react/macro';
import { Box, Stack, Text } from '@mantine/core';
import { SubmissionId, SubmissionType } from '@postybirb/types';
import { useMemo } from 'react';
import { SubmissionPicker } from '../../../../shared/submission-picker/submission-picker';

export interface DependsOnFormProps {
  /** The submission being edited (excluded from its own dependency options). */
  submissionId: SubmissionId;
  /** The submission type, used to scope the picker. */
  type: SubmissionType;
  /** Currently selected dependency submission IDs. */
  value: SubmissionId[];
  /** Whether the control is disabled (e.g. archived submissions). */
  disabled?: boolean;
  /** Called with the new dependency list when the selection changes. */
  onChange: (dependsOn: SubmissionId[]) => void;
}

/**
 * Form section for editing a submission's cross-submission dependencies.
 */
export function DependsOnForm({
  submissionId,
  type,
  value,
  disabled,
  onChange,
}: DependsOnFormProps) {
  const excludeIds = useMemo(() => [submissionId], [submissionId]);

  return (
    <Stack gap="xs">
      <Box>
        <Text fw={500} size="sm">
          <Trans>Depends on</Trans>
        </Text>
        <Text size="xs" c="dimmed">
          <Trans>
            Wait to post this submission until the selected submissions have
            finished posting successfully.
          </Trans>
        </Text>
      </Box>
      <SubmissionPicker
        type={type}
        value={value}
        onChange={onChange}
        excludeIds={excludeIds}
        disabled={disabled}
        label={null}
        placeholder=""
      />
    </Stack>
  );
}
