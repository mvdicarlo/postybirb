import { Trans } from '@lingui/macro';
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
import { Tag, TagConverterDto, TagGroupDto, TagValue } from '@postybirb/types';
import { IconArrowRight } from '@tabler/icons-react';
import { flatten, uniq } from 'lodash';
import { useWebsites } from '../../../hooks/account/use-websites';
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

function getTagConversion(
  website: string,
  tagConverters: TagConverterDto[],
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

export function TagField(props: FormFieldProps<TagFieldType>): JSX.Element {
  const { field, form, propKey, option } = props;
  const { state: tagGroups } = useStore(TagGroupStore);
  const defaultOption = useDefaultOption<TagValue>(props);
  const validations = useValidations(props);
  const { state: tagConverters } = useStore(TagConverterStore);
  const { accounts } = useWebsites();
  const account = accounts.find((acc) => acc.id === option.account);
  const overrideProps = form.getInputProps(`${propKey}.overrideDefault`);
  const tagsProps = form.getInputProps(`${propKey}.tags`);
  const tagValue = tagsProps.defaultValue as Tag[];
  const allTags = [...tagValue, ...(defaultOption?.tags || [])];
  const convertedTags = (
    account
      ? allTags.map((tag) => [
          tag,
          getTagConversion(account.website, tagConverters, tag),
        ])
      : []
  ).filter(([tag, converted]) => converted !== tag);

  const tagGroupsOptions = tagGroups.map((tagGroup) => ({
    label: `${TAG_GROUP_LABEL}${JSON.stringify(tagGroup)}`,
    value: `${TAG_GROUP_LABEL}${JSON.stringify(tagGroup)}`,
    disabled: containsAllTagsInGroup(tagValue, tagGroup),
  }));

  const updateTags = (tags: Tag[]) => {
    if (defaultOption && !overrideProps.value) {
      const defaultTags = defaultOption.tags || [];

      form.setFieldValue(
        `${propKey}.tags`,
        uniq(tags.filter((tag) => !defaultTags.includes(tag))),
      );
    } else {
      form.setFieldValue(`${propKey}.tags`, uniq(tags));
    }
  };

  const totalTags: number = overrideProps.defaultValue
    ? tagValue.length
    : allTags.length;

  return (
    <Box>
      <FieldLabel {...props} validationState={validations}>
        {option.isDefault ? null : (
          <Checkbox
            mb="4"
            {...overrideProps}
            defaultChecked={overrideProps.defaultValue || false}
            label={
              <Trans context="override-default">Ignore default tags</Trans>
            }
          />
        )}
        {convertedTags.length > 0 && (
          <Box>
            <Text display="inline-block" size="sm" c="green">
              <Trans>Converted:</Trans>
            </Text>
            <Group display="inline-block" ml="4">
              {convertedTags.map(([tag, convertedTag]) => (
                <Badge size="xs" variant="light">
                  {tag}{' '}
                  <IconArrowRight
                    size="0.75rem"
                    style={{ verticalAlign: 'middle' }}
                  />{' '}
                  {convertedTag}
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
          data={[...tagGroupsOptions]}
          onClear={() => form.setFieldValue(`${propKey}.tags`, [])}
          description={
            field.maxTags ? `${totalTags ?? 0} / ${field.maxTags}` : undefined
          }
          onChange={(tags) => {
            // Need to support , which is only detectable when the array contains values not in the tagValue
            const newTags = flatten(
              tags.map((tag) => {
                if (tag.startsWith(TAG_GROUP_LABEL)) {
                  const group: TagGroupDto = JSON.parse(
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
            if (value.startsWith(TAG_GROUP_LABEL)) {
              const group: TagGroupDto = JSON.parse(
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

            return <Text>{value}</Text>;
          }}
        />
      </FieldLabel>
    </Box>
  );
}
