import { Trans } from '@lingui/macro';
import { Box, Checkbox, Pill, TagsInput, Text } from '@mantine/core';
import { TagFieldType } from '@postybirb/form-builder';
import { Tag, TagGroupDto, TagValue } from '@postybirb/types';
import { uniq } from 'lodash';
import { TagConverterStore } from '../../../stores/tag-converter-store';
import { TagGroupStore } from '../../../stores/tag-group-store';
import { useStore } from '../../../stores/use-store';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

const TAG_GROUP_LABEL = 'GROUP:';

function containsAllTagsInGroup(tags: Tag[], group: TagGroupDto): boolean {
  return group.tags.every((tag) => tags.includes(tag));
}

export function TagField(props: FormFieldProps<TagFieldType>): JSX.Element {
  const { field, form, propKey, option } = props;
  const { state: tagGroups } = useStore(TagGroupStore);
  const { state: tagConverters } = useStore(TagConverterStore);
  const defaultOption = useDefaultOption<TagValue>(props);
  const validations = useValidations(props);

  const overrideProps = form.getInputProps(`${propKey}.overrideDefault`);
  const tagsProps = form.getInputProps(`${propKey}.tags`);
  const tagValue = tagsProps.defaultValue as Tag[];

  const tagGroupsOptions = tagGroups.map((tagGroup) => ({
    label: `${TAG_GROUP_LABEL}${tagGroup.name}`,
    value: `${TAG_GROUP_LABEL}${JSON.stringify(tagGroup)}`,
    disabled: containsAllTagsInGroup(tagValue, tagGroup),
  }));

  const updateTags = (tags: Tag[]) => {
    if (defaultOption && !overrideProps.value) {
      const defaultTags = defaultOption.tags || [];

      form.setFieldValue(
        `${propKey}.tags`,
        uniq(tags.filter((tag) => !defaultTags.includes(tag)))
      );
    } else {
      form.setFieldValue(`${propKey}.tags`, uniq(tags));
    }
  };

  // TODO converters
  return (
    <Box>
      <FieldLabel {...props} validationState={validations}>
        {option.isDefault ? null : (
          <Checkbox
            mb="4"
            {...overrideProps}
            checked={overrideProps.defaultValue || false}
            label={
              <Trans context="override-default">Ignore default tags</Trans>
            }
          />
        )}
        <TagsInput
          clearable
          required={field.required}
          value={tagValue}
          data={[...tagGroupsOptions]}
          onOptionSubmit={(tag) => {
            if (tag.startsWith(TAG_GROUP_LABEL)) {
              const group: TagGroupDto = JSON.parse(
                tag.slice(TAG_GROUP_LABEL.length)
              );
              updateTags([...tagValue, ...group.tags]);
            } else {
              updateTags([...tagValue, tag]);
            }
          }}
          onClear={() => form.setFieldValue(`${propKey}.tags`, [])}
          onChange={(tags) => {
            // Need to support , which is only detectable when the array contains values not in the tagValue
            const newTags = tags
              .filter((tag) => !tag.startsWith(TAG_GROUP_LABEL))
              .filter((tag) => !tagValue.includes(tag));
            if (newTags.length === 0) {
              return;
            }
            updateTags([...tagValue, ...newTags]);
          }}
          renderOption={(tagOption) => {
            const { value } = tagOption.option;
            if (value.startsWith(TAG_GROUP_LABEL)) {
              const group: TagGroupDto = JSON.parse(
                value.slice(TAG_GROUP_LABEL.length)
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
            return <Text>{value}</Text>;
          }}
        />
      </FieldLabel>
    </Box>
  );
}
