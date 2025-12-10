/**
 * SubmissionQuickEditActions - Quick edit controls for submissions.
 * Provides inline editing for tags and rating without opening the full editor.
 */

import { useLingui } from '@lingui/react/macro';
import { Group, Rating, TagsInput, Tooltip } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import {
    DefaultTagValue,
    IWebsiteFormFields,
    SubmissionRating,
    TagValue,
} from '@postybirb/types';
import {
    IconCircleLetterE,
    IconCircleLetterM,
    IconExclamationCircle,
    IconRating18Plus,
    IconTag,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SubmissionRecord } from '../../../../stores';

type SubmissionQuickEditActionsProps = {
  submission: SubmissionRecord;
  onDefaultOptionChange?: (update: Partial<IWebsiteFormFields>) => void;
};

type QuickEditTagsProps = {
  tags: TagValue;
  onChange: (tags: TagValue) => void;
};

type QuickEditRatingProps = {
  rating: SubmissionRating;
  onChange: (rating: SubmissionRating) => void;
};

// Map rating enum to numeric value (1-4)
const ratingToValue: Record<SubmissionRating, number> = {
  [SubmissionRating.GENERAL]: 1,
  [SubmissionRating.MATURE]: 2,
  [SubmissionRating.ADULT]: 3,
  [SubmissionRating.EXTREME]: 4,
};

// Map numeric value to rating enum
const valueToRating: Record<number, SubmissionRating> = {
  1: SubmissionRating.GENERAL,
  2: SubmissionRating.MATURE,
  3: SubmissionRating.ADULT,
  4: SubmissionRating.EXTREME,
};

const getIconStyle = (color?: string) => ({
  width: 18,
  height: 18,
  color: color ? `var(--mantine-color-${color}-7)` : undefined,
});

const getEmptyIcon = (value: number) => {
  const iconStyle = getIconStyle();

  switch (value) {
    case 1:
      return <IconCircleLetterE style={iconStyle} />;
    case 2:
      return <IconCircleLetterM style={iconStyle} />;
    case 3:
      return <IconRating18Plus style={iconStyle} />;
    case 4:
      return <IconExclamationCircle style={iconStyle} />;
    default:
      return null;
  }
};

const getFullIcon = (value: number) => {
  switch (value) {
    case 1:
      return <IconCircleLetterE style={getIconStyle('green')} />;
    case 2:
      return <IconCircleLetterM style={getIconStyle('yellow')} />;
    case 3:
      return <IconRating18Plus style={getIconStyle('orange')} />;
    case 4:
      return <IconExclamationCircle style={getIconStyle('red')} />;
    default:
      return null;
  }
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

/**
 * Inline rating editor using Mantine Rating with custom symbols.
 */
function QuickEditRating({ rating, onChange }: QuickEditRatingProps) {
  const { t } = useLingui();
  const value = ratingToValue[rating] ?? 1;

  // Rating labels for tooltips (must be inside component for translations)
  const ratingLabels: Record<number, string> = {
    1: t`Safe`,
    2: t`Mature`,
    3: t`Adult`,
    4: t`Extreme`,
  };

  const ratingLabel = ratingLabels[value];

  const handleChange = useCallback(
    (newValue: number) => {
      // Rating component can return 0 if clicked on same value, keep at least 1
      const safeValue = Math.max(1, newValue);
      const newRating = valueToRating[safeValue];
      if (newRating && newRating !== rating) {
        onChange(newRating);
      }
    },
    [rating, onChange],
  );

  return (
    <Group gap="xs" onClick={(e) => e.stopPropagation()}>
      <Tooltip label={ratingLabel} position="top">
        <Rating
          value={value}
          count={4}
          onChange={handleChange}
          emptySymbol={getEmptyIcon}
          fullSymbol={getFullIcon}
        />
      </Tooltip>
    </Group>
  );
}

export function SubmissionQuickEditActions({
  submission,
  onDefaultOptionChange,
}: SubmissionQuickEditActionsProps) {
  const defaultOptions = submission.getDefaultOptions();
  const tags = defaultOptions?.data.tags ?? DefaultTagValue();
  const rating = defaultOptions?.data.rating ?? SubmissionRating.GENERAL;

  const handleTagsChange = useCallback(
    (newTags: TagValue) => {
      onDefaultOptionChange?.({ tags: newTags });
    },
    [onDefaultOptionChange],
  );

  const handleRatingChange = useCallback(
    (newRating: SubmissionRating) => {
      onDefaultOptionChange?.({ rating: newRating });
    },
    [onDefaultOptionChange],
  );

  return (
    <Group
      className="postybirb__submission__quick_edit_actions"
      gap="2"
      align="flex-end"
    >
      <QuickEditRating rating={rating} onChange={handleRatingChange} />
      <QuickEditTags tags={tags} onChange={handleTagsChange} />
    </Group>
  );
}
