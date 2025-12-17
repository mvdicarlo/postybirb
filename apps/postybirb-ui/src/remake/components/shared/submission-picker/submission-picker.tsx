/**
 * SubmissionPicker - MultiSelect component for choosing submissions.
 * Shows thumbnail previews when available, filters out posting/archived submissions.
 */

import { Trans } from '@lingui/react/macro';
import {
  Avatar,
  Checkbox,
  Group,
  Image,
  MultiSelect,
  type MultiSelectProps,
  Stack,
  Text,
} from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { IconFile, IconMessage } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useSubmissionsByType } from '../../../stores/submission-store';
import { defaultTargetProvider } from '../../../transports/http-client';
import type { SubmissionRecord } from '../../../stores/records';

export interface SubmissionPickerProps extends Omit<
  MultiSelectProps,
  'data' | 'value' | 'onChange'
> {
  /** Selected submission IDs */
  value: string[];
  /** Callback when selection changes */
  onChange: (ids: string[]) => void;
  /** Filter submissions by type */
  type: SubmissionType;
  /** Submission IDs to exclude from the picker (e.g., the source submission) */
  excludeIds?: string[];
}

interface SubmissionMeta {
  thumbnail: string | null;
  type: SubmissionType;
}

/**
 * Get thumbnail URL for a submission's primary file.
 */
function getThumbnailUrl(submission: SubmissionRecord): string | null {
  const { primaryFile } = submission;
  if (!primaryFile?.hasThumbnail || !primaryFile?.thumbnailId) {
    return null;
  }
  return `${defaultTargetProvider()}/api/file/file/${primaryFile.thumbnailId}?${primaryFile.hash}`;
}

/**
 * MultiSelect component for picking multiple submissions.
 * Filters out templates, multi-submissions, posting, and archived submissions.
 */
export function SubmissionPicker({
  value,
  onChange,
  type,
  excludeIds = [],
  label,
  placeholder,
  ...selectProps
}: SubmissionPickerProps) {
  const allSubmissions = useSubmissionsByType(type);

  // Build options and metadata map
  const { options, metaMap } = useMemo(() => {
    // Filter out templates, multi-submissions, posting, archived, and excluded IDs
    const filtered = allSubmissions.filter(
      (s) =>
        !s.isTemplate &&
        !s.isMultiSubmission &&
        !s.isPosting &&
        !s.isArchived &&
        !excludeIds.includes(s.id),
    );

    // Sort alphabetically by title
    const sorted = filtered.sort((a, b) => a.title.localeCompare(b.title));

    const opts = sorted.map((submission) => ({
      value: submission.id,
      // eslint-disable-next-line lingui/no-unlocalized-strings
      label: submission.title || 'Untitled',
    }));

    const meta = new Map<string, SubmissionMeta>();
    sorted.forEach((submission) => {
      meta.set(submission.id, {
        thumbnail: getThumbnailUrl(submission),
        type: submission.type,
      });
    });

    return { options: opts, metaMap: meta };
  }, [allSubmissions, excludeIds]);

  // Custom render option with thumbnail preview
  const renderOption = (input: {
    option: { value: string; label: string };
    checked?: boolean;
  }) => {
    const { option, checked = false } = input;
    const meta = metaMap.get(option.value);

    return (
      <Group gap="sm" wrap="nowrap">
        <Checkbox checked={checked} readOnly tabIndex={-1} />
        {meta?.thumbnail ? (
          <Image
            src={meta.thumbnail}
            alt=""
            h={32}
            w={32}
            fit="cover"
            radius={4}
          />
        ) : (
          <Avatar size={32} radius={4} color="gray">
            {meta?.type === SubmissionType.FILE ? (
              <IconFile size={18} />
            ) : (
              <IconMessage size={18} />
            )}
          </Avatar>
        )}
        <Text size="sm" truncate="end" style={{ flex: 1 }}>
          {option.label}
        </Text>
      </Group>
    );
  };

  return (
    <Stack gap="xs">
      <MultiSelect
        data={options}
        value={value}
        onChange={onChange}
        label={label ?? <Trans>Select submissions</Trans>}
        placeholder={placeholder}
        searchable
        clearable
        maxDropdownHeight={300}
        renderOption={renderOption}
        nothingFoundMessage={<Trans>No submissions found</Trans>}
        {...selectProps}
      />
      {value.length > 0 && (
        <Text size="xs" c="dimmed">
          <Trans>{value.length} submissions selected</Trans>
        </Text>
      )}
    </Stack>
  );
}
