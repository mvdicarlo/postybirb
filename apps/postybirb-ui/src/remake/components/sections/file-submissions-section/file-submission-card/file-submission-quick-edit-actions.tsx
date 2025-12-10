/**
 * FileSubmissionQuickEditActions - Quick edit controls for file submissions.
 * Provides inline editing for tags without opening the full editor.
 */

import { Stack, TagsInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { DefaultTagValue, TagValue } from '@postybirb/types';
import { IconTag } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SubmissionRecord } from '../../../../stores';

type FileSubmissionQuickEditActionsProps = {
  submission: SubmissionRecord;
  onTagsChange?: (tags: TagValue) => void;
};

type QuickEditTagsProps = {
  tags: TagValue;
  onChange: (tags: TagValue) => void;
};

/**
 * Inline tags editor that saves changes on blur or after debounced input.
 */
function QuickEditTags({ tags, onChange }: QuickEditTagsProps) {
  const [localTags, setLocalTags] = useState<string[]>(tags.tags);
  const hasChanges = useRef(false);

  // Sync local tags with prop
  useEffect(() => {
    setLocalTags(tags.tags);
    hasChanges.current = false;
  }, [tags.tags]);

  // Debounced save - saves after user stops typing for 500ms
  const debouncedSave = useDebouncedCallback((newTags: string[]) => {
    if (hasChanges.current) {
      onChange({ ...tags, tags: newTags });
      hasChanges.current = false;
    }
  }, 500);

  const handleChange = useCallback(
    (value: string[]) => {
      setLocalTags(value);
      hasChanges.current = true;
      debouncedSave(value);
    },
    [debouncedSave],
  );

  const handleBlur = useCallback(() => {
    // Save immediately on blur if there are pending changes
    if (hasChanges.current) {
      debouncedSave.cancel();
      onChange({ ...tags, tags: localTags });
      hasChanges.current = false;
    }
  }, [localTags, tags, onChange, debouncedSave]);

  return (
    <TagsInput
      clearable
      size="xs"
      className="postybirb__file_submission__quick_edit_tags"
      leftSection={<IconTag size="13" />}
      value={localTags}
      onChange={handleChange}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function FileSubmissionQuickEditActions({
  submission,
  onTagsChange,
}: FileSubmissionQuickEditActionsProps) {
  const defaultOptions = submission.getDefaultOptions();
  const tags = defaultOptions?.data.tags ?? DefaultTagValue();

  const handleTagsChange = useCallback(
    (newTags: TagValue) => {
      onTagsChange?.(newTags);
    },
    [onTagsChange],
  );

  return (
    <Stack className="postybirb__file_submission__quick_edit_actions">
      <QuickEditTags tags={tags} onChange={handleTagsChange} />
    </Stack>
  );
}
