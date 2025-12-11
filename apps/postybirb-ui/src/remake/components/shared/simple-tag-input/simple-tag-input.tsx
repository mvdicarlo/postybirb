/**
 * SimpleTagInput - A shared tag input component with tag group and search support.
 *
 * Features:
 * - Tag group insertion (select groups to add all their tags)
 * - Tag search provider integration (e.g., e621 autocomplete)
 * - Clean UI with tag pills and group pills
 */

import { Trans } from '@lingui/react/macro';
import { Box, Pill, TagsInput, TagsInputProps, Text } from '@mantine/core';
import { Tag, TagGroupDto } from '@postybirb/types';
import { IconTag } from '@tabler/icons-react';
import { flatten, uniq } from 'lodash';
import { useCallback, useMemo } from 'react';
import { useTagSearch } from '../../../hooks/tag-search';
import { useTagSearchProvider } from '../../../stores/settings-store';
import { useTagGroups } from '../../../stores/tag-group-store';

/**
 * Special prefix used to identify tag group options in the dropdown.
 */
const TAG_GROUP_LABEL = 'GROUP:';

export interface SimpleTagInputProps {
  /** Current tag value */
  value: Tag[];
  /** Callback when tags change */
  onChange: (tags: Tag[]) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Field-specific search provider ID (overrides user settings) */
  searchProviderId?: string;
  /** Size of the input */
  size?: TagsInputProps['size'];
  /** Whether to show the tag icon in the input */
  showIcon?: boolean;
  /** Whether the input should be clearable */
  clearable?: boolean;
  /** Additional class name */
  className?: string;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Whether the field is required */
  required?: boolean;
  /** Label for the input */
  label?: string;
  /** Description text below the input */
  description?: string;
  /** Error message to display */
  error?: string;
}

/**
 * Check if all tags in a group are already in the current tags list.
 */
function containsAllTagsInGroup(tags: Tag[], groupTags: Tag[]): boolean {
  return groupTags.every((tag) => tags.includes(tag));
}

/**
 * SimpleTagInput - Tag input with tag group and search provider support.
 */
export function SimpleTagInput({
  value,
  onChange,
  placeholder,
  searchProviderId,
  size = 'sm',
  showIcon = true,
  clearable = true,
  className,
  maxTags,
  required,
  label,
  description,
  error,
}: SimpleTagInputProps) {
  const tagGroups = useTagGroups();
  const search = useTagSearch(searchProviderId);
  const tagSearchProviderSettings = useTagSearchProvider();

  // Build tag group options for the dropdown
  const tagGroupOptions = useMemo(
    () =>
      tagGroups
        .filter((group) => group.tags.length > 0)
        .map((tagGroup) => {
          // Create a TagGroupDto-like object for serialization
          const groupData: TagGroupDto = {
            id: tagGroup.id,
            name: tagGroup.name,
            tags: tagGroup.tags,
            createdAt: tagGroup.createdAt.toString(),
            updatedAt: tagGroup.updatedAt.toString(),
          };
          return {
            label: `${TAG_GROUP_LABEL}${JSON.stringify(groupData)}`,
            value: `${TAG_GROUP_LABEL}${JSON.stringify(groupData)}`,
            disabled: containsAllTagsInGroup(value, tagGroup.tags),
          };
        }),
    [tagGroups, value],
  );

  // Combine search results with tag group options
  const dropdownData = useMemo(
    () => [...search.data, ...tagGroupOptions],
    [search.data, tagGroupOptions],
  );

  // Handle tag changes, including expanding tag groups
  const handleChange = useCallback(
    (tags: string[]) => {
      const expandedTags = flatten(
        tags.map((tag) => {
          // If this is a tag group, extract its tags
          if (tag.startsWith(TAG_GROUP_LABEL)) {
            const group: TagGroupDto = JSON.parse(
              tag.slice(TAG_GROUP_LABEL.length),
            );
            return group.tags;
          }
          return tag;
        }),
      );
      onChange(uniq(expandedTags));
    },
    [onChange],
  );

  // Handle clearing all tags
  const handleClear = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Render custom dropdown options (tag groups with their tags shown)
  const renderOption = useCallback(
    (tagOption: { option: { value: string } }) => {
      const { value: optionValue } = tagOption.option;

      // Render tag group options with special formatting
      if (optionValue.startsWith(TAG_GROUP_LABEL)) {
        const group: TagGroupDto = JSON.parse(
          optionValue.slice(TAG_GROUP_LABEL.length),
        );
        return (
          <Box>
            <Pill c="teal" mr="xs">
              <strong>{group.name}</strong>
            </Pill>
            {group.tags.map((tag) => (
              <Pill key={tag} c="gray" ml="4">
                {tag}
              </Pill>
            ))}
          </Box>
        );
      }

      // Render search provider custom item if available
      if (search.provider && tagSearchProviderSettings) {
        const view = search.provider.renderSearchItem(
          optionValue,
          tagSearchProviderSettings,
        );
        if (view) return view;
      }

      // Default text rendering
      return <Text inherit>{optionValue}</Text>;
    },
    [search.provider, tagSearchProviderSettings],
  );

  // Build description with count if maxTags is set
  const inputDescription = useMemo(() => {
    if (maxTags) {
      return (
        <Text size="xs" c="dimmed">
          {value.length} / {maxTags} <Trans>tags</Trans>
        </Text>
      );
    }
    return description;
  }, [maxTags, value.length, description]);

  return (
    <TagsInput
      className={className}
      size={size}
      clearable={clearable}
      required={required}
      label={label}
      description={inputDescription}
      error={error}
      placeholder={placeholder}
      leftSection={showIcon ? <IconTag size={16} /> : undefined}
      value={value}
      data={dropdownData}
      searchValue={search.searchValue}
      onSearchChange={search.onSearchChange}
      onClear={handleClear}
      onChange={handleChange}
      renderOption={renderOption}
    />
  );
}
