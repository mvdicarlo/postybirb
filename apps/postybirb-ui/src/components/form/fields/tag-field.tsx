import { Trans } from '@lingui/macro';
import {
    Box,
    Checkbox,
    ComboboxItem,
    ComboboxItemGroup,
    Pill,
    TagsInput,
    Text,
} from '@mantine/core';
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

  const tagGroupsOptions: ComboboxItemGroup<ComboboxItem>[] = tagGroups.map(
    (tagGroup) => ({
      label: `GROUP:${tagGroup.name}`,
      value: `group:${JSON.stringify(tagGroup)}`,
      disabled: containsAllTagsInGroup(tagValue, tagGroup),
    })
  );

  // TODO min/max, filter default tags out, copy btn, converters
  return (
    <Box>
      {option.isDefault ? null : (
        <Checkbox
          {...overrideProps}
          label={<Trans context="override-default">Override default</Trans>}
        />
      )}
      <FieldLabel {...props} validationState={validations}>
        <TagsInput
          clearable
          value={tagValue}
          data={[...tagGroupsOptions]}
          onOptionSubmit={(tag) => {
            if (tag.startsWith(TAG_GROUP_LABEL)) {
              const group: TagGroupDto = JSON.parse(tag.slice(6));
              form.setFieldValue(
                `${propKey}.tags`,
                uniq([...tagValue, ...group.tags])
              );
            } else {
              form.setFieldValue(`${propKey}.tags`, uniq([...tagValue, tag]));
            }
          }}
          onClear={() => form.setFieldValue(`${propKey}.tags`, [])}
          onChange={(tags) => {
            // Need to support , which is only detectable when the array contains values not in the tagValue
            const newTags = tags
              .filter((tag) => !tag.startsWith(TAG_GROUP_LABEL))
              .filter((tag) => !tagValue.includes(tag));
            form.setFieldValue(
              `${propKey}.tags`,
              uniq([...tagValue, ...newTags])
            );
          }}
          renderOption={(tagOption) => {
            const { value } = tagOption.option;
            if (value.startsWith(TAG_GROUP_LABEL)) {
              const group: TagGroupDto = JSON.parse(value.slice(6));
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
