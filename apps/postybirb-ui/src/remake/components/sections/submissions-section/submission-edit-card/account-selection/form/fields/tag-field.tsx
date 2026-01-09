/**
 * TagField - Tag input with groups, conversion display, and search provider support.
 */

import { Trans } from '@lingui/react/macro';
import {
  Badge,
  Box,
  Checkbox,
  Group,
  Pill,
  TagsInput,
  Text,
} from '@mantine/core';
import { TagFieldType } from '@postybirb/form-builder';
import { DefaultTagValue, Tag, TagValue } from '@postybirb/types';
import { IconArrowRight } from '@tabler/icons-react';
import { flatten, uniq } from 'lodash';
import { useMemo } from 'react';
import { useTagSearch } from '../../../../../../../hooks';
import {
  TagConverterRecord,
  TagGroupRecord,
  useAccount,
  useNonEmptyTagGroups,
  useSettings,
  useTagConverters,
} from '../../../../../../../stores';
import { useFormFieldsContext } from '../form-fields-context';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

const TAG_GROUP_LABEL = 'GROUP:';

/**
 * Check if all tags in a group are already in the current tag list.
 */
function containsAllTagsInGroup(tags: Tag[], group: TagGroupRecord): boolean {
  return group.tags.every((tag) => tags.includes(tag));
}

/**
 * Get the converted tag for a specific website.
 */
function getTagConversion(
  website: string,
  tagConverters: TagConverterRecord[],
  tag: Tag,
): Tag {
  const matchingConverter = tagConverters.find(
    (converter) => converter.tag === tag,
  );
  if (!matchingConverter) {
    return tag;
  }

  return (
    matchingConverter.convertTo[website] ??
    matchingConverter.convertTo.default ??
    tag
  );
}

export function TagField({
  fieldName,
  field,
}: FormFieldProps<TagFieldType>): JSX.Element {
  const { getValue, setValue, option } = useFormFieldsContext();
  const defaultOption = useDefaultOption<TagValue>(fieldName);
  const validations = useValidations(fieldName);

  // Get tag groups and converters
  const tagGroups = useNonEmptyTagGroups();
  const tagConverters = useTagConverters();
  const account = useAccount(option.accountId);
  const settings = useSettings();

  // Tag search provider
  const search = useTagSearch(field.searchProviderId);

  const fieldValue =
    getValue<TagValue>(fieldName) ?? field.defaultValue ?? DefaultTagValue();
  const overrideDefault = fieldValue.overrideDefault || false;
  const tagValue = useMemo(() => fieldValue.tags || [], [fieldValue.tags]);
  const allTags = useMemo(
    () => [...tagValue, ...(defaultOption?.tags || [])],
    [tagValue, defaultOption?.tags],
  );

  // Calculate tag conversions for display
  const convertedTags = useMemo(() => {
    if (!account) return [];
    return allTags
      .map((tag) => {
        const converted = getTagConversion(account.website, tagConverters, tag);
        return [tag, converted] as [Tag, Tag];
      })
      .filter(([tag, converted]) => converted !== tag);
  }, [account, allTags, tagConverters]);

  // Build tag group options for dropdown
  const tagGroupsOptions = useMemo(
    () =>
      tagGroups.map((tagGroup) => ({
        label: `${TAG_GROUP_LABEL}${JSON.stringify({ name: tagGroup.name, tags: tagGroup.tags })}`,
        value: `${TAG_GROUP_LABEL}${JSON.stringify({ name: tagGroup.name, tags: tagGroup.tags })}`,
        disabled: containsAllTagsInGroup(tagValue, tagGroup),
      })),
    [tagGroups, tagValue],
  );

  const updateTags = (tags: Tag[]) => {
    if (defaultOption && !overrideDefault) {
      const defaultTags = defaultOption.tags || [];
      setValue(fieldName, {
        ...fieldValue,
        tags: uniq(tags.filter((tag) => !defaultTags.includes(tag))),
      });
    } else {
      setValue(fieldName, { ...fieldValue, tags: uniq(tags) });
    }
  };

  const totalTags = overrideDefault ? tagValue.length : allTags.length;

  return (
    <Box>
      <FieldLabel
        field={field}
        fieldName={fieldName}
        validationState={validations}
      >
        {option.isDefault ? null : (
          <Checkbox
            mb="4"
            checked={overrideDefault}
            onChange={(e) => {
              setValue(fieldName, {
                ...fieldValue,
                overrideDefault: e.target.checked,
              });
            }}
            label={
              <Trans context="override-default">Ignore default tags</Trans>
            }
          />
        )}

        {/* Display tag conversions */}
        {convertedTags.length > 0 && (
          <Box mb="xs">
            <Group gap="xs">
              {convertedTags.map(([tag, convertedTag]) => (
                <Badge key={tag} size="xs" variant="light">
                  <Group gap="4">
                    {tag}
                    <IconArrowRight
                      size="0.75rem"
                      style={{ verticalAlign: 'middle' }}
                    />
                    {convertedTag}
                  </Group>
                </Badge>
              ))}
            </Group>
          </Box>
        )}

        <TagsInput
          inputWrapperOrder={['label', 'input', 'description', 'error']}
          clearable
          required={field.required}
          value={tagValue}
          data={[...search.data, ...tagGroupsOptions]}
          searchValue={search.searchValue}
          onSearchChange={search.onSearchChange}
          onClear={() => {
            setValue(fieldName, { ...fieldValue, tags: [] });
          }}
          description={
            field.maxTags ? `${totalTags ?? 0} / ${field.maxTags}` : undefined
          }
          onChange={(tags) => {
            // Handle tag groups - expand group to individual tags
            const newTags = flatten(
              tags.map((tag) => {
                if (tag.startsWith(TAG_GROUP_LABEL)) {
                  const group: { name: string; tags: Tag[] } = JSON.parse(
                    tag.slice(TAG_GROUP_LABEL.length),
                  );
                  return group.tags;
                }
                return tag;
              }),
            );
            updateTags([...newTags]);
          }}
          renderOption={(tagOption) => {
            const { value } = tagOption.option;

            // Render tag group option
            if (value.startsWith(TAG_GROUP_LABEL)) {
              const group: { name: string; tags: Tag[] } = JSON.parse(
                value.slice(TAG_GROUP_LABEL.length),
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

            // Render search provider item
            if (search.provider && settings) {
              const view = search.provider.renderSearchItem(
                value,
                settings.tagSearchProvider ?? { id: '' },
              );
              if (view) return view;
            }

            return <Text inherit>{value}</Text>;
          }}
        />
      </FieldLabel>
    </Box>
  );
}
