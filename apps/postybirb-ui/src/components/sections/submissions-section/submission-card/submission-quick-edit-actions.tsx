/**
 * SubmissionQuickEditActions - Quick edit controls for submissions.
 * Provides inline editing for tags and rating without opening the full editor.
 * Uses SubmissionsContext for actions via useSubmissionActions hook.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
    CloseButton,
    Combobox,
    Group,
    Pill,
    PillsInput,
    ScrollArea,
    Stack,
    Text,
    UnstyledButton,
    useCombobox,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { DefaultTagValue, SubmissionRating, TagValue } from '@postybirb/types';
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
  const { t } = useLingui();
  const [localTags, setLocalTags] = useState<string[]>(tags.tags);
  const [inputValue, setInputValue] = useState('');
  const hasChanges = useRef(false);
  const railRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFocusedRef = useRef(false);
  const combobox = useCombobox();

  // Sync local tags with prop
  useEffect(() => {
    setLocalTags(tags.tags);
    hasChanges.current = false;
  }, [tags.tags]);

  useEffect(() => {
    if (railRef.current) {
      railRef.current.scrollLeft = railRef.current.scrollWidth;
    }
  }, [localTags.length]);

  useEffect(
    () => () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    },
    [],
  );

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

  const addInputTag = useCallback(() => {
    const tag = inputValue.trim();
    if (!tag) return localTags;

    const nextTags = localTags.includes(tag)
      ? localTags
      : [...localTags, tag];
    setInputValue('');
    handleChange(nextTags);
    return nextTags;
  }, [handleChange, inputValue, localTags]);

  const removeTag = useCallback(
    (tag: string) => {
      handleChange(localTags.filter((item) => item !== tag));
    },
    [handleChange, localTags],
  );

  const removeAllTags = useCallback(() => {
    setInputValue('');
    handleChange([]);
  }, [handleChange]);

  const cancelScheduledClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const openDropdown = useCallback(() => {
    cancelScheduledClose();
    combobox.openDropdown();
  }, [cancelScheduledClose, combobox]);

  const scheduleDropdownClose = useCallback(() => {
    cancelScheduledClose();
    closeTimeoutRef.current = setTimeout(() => {
      if (!isFocusedRef.current) {
        combobox.closeDropdown();
      }
    }, 150);
  }, [cancelScheduledClose, combobox]);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;
    const nextTags = addInputTag();
    // Save immediately on blur if there are pending changes
    // The hasChanges flag prevents the debounced callback from double-saving
    if (hasChanges.current) {
      onChange({ ...tags, tags: nextTags });
      hasChanges.current = false;
    }
    scheduleDropdownClose();
  }, [addInputTag, onChange, scheduleDropdownClose, tags]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        addInputTag();
      } else if (
        event.key === 'Backspace' &&
        inputValue.length === 0 &&
        localTags.length > 0
      ) {
        handleChange(localTags.slice(0, -1));
      }
    },
    [addInputTag, handleChange, inputValue.length, localTags],
  );

  return (
    <Combobox
      store={combobox}
      width={260}
      position="bottom-end"
      withinPortal
      middlewares={{ flip: true, shift: true }}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          size="xs"
          className="postybirb__submission__quick_edit_tags"
          classNames={{
            input: 'postybirb__submission__quick_edit_tag_input',
          }}
          rightSectionWidth={localTags.length > 0 ? 40 : 24}
          rightSection={
            <Group gap={2} wrap="nowrap" align="center">
              {localTags.length > 0 && (
                <Text
                  size="xs"
                  c="dimmed"
                  className="postybirb__submission__tag_count"
                >
                  {localTags.length}
                </Text>
              )}
              <Combobox.Chevron size="xs" />
            </Group>
          }
          onClick={(event) => {
            event.stopPropagation();
            openDropdown();
          }}
          onKeyDown={(event) => event.stopPropagation()}
          onMouseEnter={openDropdown}
          onMouseLeave={scheduleDropdownClose}
          aria-label={t`Edit tags`}
        >
          <Pill.Group
            ref={railRef}
            className="postybirb__submission__quick_edit_tag_rail"
          >
            {localTags.map((tag) => (
              <Pill
                key={tag}
                size="xs"
                className="postybirb__submission__quick_edit_tag_pill"
                withRemoveButton
                onRemove={() =>
                  handleChange(localTags.filter((item) => item !== tag))
                }
              >
                {tag}
              </Pill>
            ))}
            <Combobox.EventsTarget>
              <PillsInput.Field
                className="postybirb__submission__quick_edit_tag_field"
                value={inputValue}
                onChange={(event) => {
                  setInputValue(event.currentTarget.value);
                  openDropdown();
                }}
                onFocus={() => {
                  isFocusedRef.current = true;
                  openDropdown();
                }}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={localTags.length === 0 ? t`Add tags` : undefined}
                aria-label={t`Add tags`}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown
        className="postybirb__submission__quick_edit_tag_dropdown"
        onMouseEnter={cancelScheduledClose}
        onMouseLeave={scheduleDropdownClose}
      >
        <Group
          justify="space-between"
          gap="xs"
          wrap="nowrap"
          className="postybirb__submission__tag_dropdown_header"
        >
          <Text size="xs" fw={600}>
            <Trans>Tags</Trans> ({localTags.length})
          </Text>
          {localTags.length > 0 && (
            <UnstyledButton
              className="postybirb__submission__tag_remove_all"
              onMouseDown={(event) => event.preventDefault()}
              onClick={removeAllTags}
            >
              <Text size="xs" c="red">
                <Trans>Remove all</Trans>
              </Text>
            </UnstyledButton>
          )}
        </Group>
        {localTags.length === 0 ? (
          <Text
            size="xs"
            c="dimmed"
            className="postybirb__submission__tag_dropdown_empty"
          >
            <Trans>No tags added yet</Trans>
          </Text>
        ) : (
          <ScrollArea.Autosize mah={220} type="auto">
            <Stack gap={2} className="postybirb__submission__tag_dropdown_list">
              {localTags.map((tag) => (
                <Group
                  key={tag}
                  gap="xs"
                  wrap="nowrap"
                  justify="space-between"
                  className="postybirb__submission__tag_row"
                >
                  <Text size="xs" truncate>
                    {tag}
                  </Text>
                  <CloseButton
                    size="xs"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => removeTag(tag)}
                    aria-label={t`Remove tag ${tag}`}
                  />
                </Group>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        )}
      </Combobox.Dropdown>
    </Combobox>
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
      gap={6}
      wrap="nowrap"
      align="center"
    >
      <RatingInput value={rating} onChange={handleRatingChange} size="sm" />
      <QuickEditTags tags={tags} onChange={handleTagsChange} />
    </Group>
  );
}
