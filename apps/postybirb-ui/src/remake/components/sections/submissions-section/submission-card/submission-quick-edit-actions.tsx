/**
 * SubmissionQuickEditActions - Quick edit controls for submissions.
 * Provides inline editing for tags and rating without opening the full editor.
 * Uses SubmissionsContext for actions via useSubmissionActions hook.
 */

import { Group, TagsInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import {
    DefaultTagValue,
    SubmissionRating,
    TagValue,
} from '@postybirb/types';
import { IconTag } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SubmissionRecord } from '../../../../stores';
import { RatingInput } from '../../../shared/rating-input';
import { useSubmissionActions } from '../hooks';

type SubmissionQuickEditActionsProps = {
  submission: SubmissionRecord;
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
      className="postybirb__submission__quick_edit_tags"
      leftSection={<IconTag size="13" />}
      value={localTags}
      onChange={handleChange}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function SubmissionQuickEditActions({
  submission,
}: SubmissionQuickEditActionsProps) {
  const { handleDefaultOptionChange } = useSubmissionActions(submission.id);
  const defaultOptions = submission.getDefaultOptions();
  const tags = defaultOptions?.data.tags ?? DefaultTagValue();
  const rating = defaultOptions?.data.rating ?? SubmissionRating.GENERAL;

  const handleTagsChange = useCallback(
    (newTags: TagValue) => {
      handleDefaultOptionChange({ tags: newTags });
    },
    [handleDefaultOptionChange],
  );

  const handleRatingChange = useCallback(
    (newRating: SubmissionRating) => {
      handleDefaultOptionChange({ rating: newRating });
    },
    [handleDefaultOptionChange],
  );

  return (
    <Group
      className="postybirb__submission__quick_edit_actions"
      gap="2"
      align="flex-end"
      onClick={(e) => e.stopPropagation()}
    >
      <RatingInput value={rating} onChange={handleRatingChange} size="sm" />
      <QuickEditTags tags={tags} onChange={handleTagsChange} />
    </Group>
  );
}
