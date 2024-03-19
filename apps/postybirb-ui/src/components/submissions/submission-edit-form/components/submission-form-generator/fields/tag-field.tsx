import {
  EuiCheckbox,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { TagFieldType } from '@postybirb/form-builder';
import { NULL_ACCOUNT_ID, TagValue } from '@postybirb/types';
import { uniq, uniqBy } from 'lodash';
import { useState } from 'react';
import { TagConverterStore } from '../../../../../../stores/tag-converter-store';
import { TagGroupStore } from '../../../../../../stores/tag-group-store';
import { useStore } from '../../../../../../stores/use-store';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';
import useValidations from './use-validations';
import useDefaultOption from './useDefaultOption';

type TagFieldProps = SubmissionGeneratedFieldProps<TagFieldType>;

export default function TagField(props: TagFieldProps) {
  const { account, field, option, propKey, onUpdate } = props;
  const { state: tagGroups } = useStore(TagGroupStore);
  const { state: tagConverters } = useStore(TagConverterStore);
  const defaultOption = useDefaultOption<TagValue>(props);

  const validation = useValidations(props);
  const value: TagValue = option.data[propKey] ?? field.defaultValue;
  const [overrideDefault, setOverrideDefault] = useState<boolean>(
    value.overrideDefault
  );
  const [tags, setTags] = useState<EuiComboBoxOptionOption<string>[]>(
    value.tags.map((tag) => ({
      value: tag,
      label: tag,
      key: tag,
    }))
  );
  const [selectedTags, setSelectedTags] =
    useState<EuiComboBoxOptionOption<string>[]>(tags);

  const onCreate = (tagValue: string) => {
    const trimmedValue = tagValue.trim();
    const foundTag = tags.find((t) => t.value === trimmedValue);
    const tagUpdate = selectedTags; // !WARN Allows mutation for paste purposes
    if (foundTag) {
      tagUpdate.push(foundTag);
    } else {
      const tag = {
        label: trimmedValue,
        key: trimmedValue,
        value: trimmedValue,
      };
      setTags([...tags, tag]);
      tagUpdate.push(tag);
    }

    setSelectedTags(tagUpdate);
    option.data[propKey] = {
      ...value,
      tags: tagUpdate.map((v) => v.value),
    };
    onUpdate();
  };

  const { _ } = useLingui();

  const tagOptions: EuiComboBoxOptionOption<string> = {
    label: _(msg`Tags`),
    isGroupLabelOption: true,
    options: tags.map((tag) => {
      const converter = tagConverters.find((c) => c.tag === tag.value);
      if (converter && converter.convertTo[account?.website ?? '']) {
        // eslint-disable-next-line no-param-reassign
        tag.label = `${tag.value} → ${
          converter.convertTo[account?.website ?? '']
        }`;
      }

      return tag;
    }),
  };

  // to satisfy component typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagGroupOptions: EuiComboBoxOptionOption<any> = {
    label: _(msg`Tag Group`),
    isGroupLabelOption: true,
    options: tagGroups.map((tagGroup) => {
      const tagList = tagGroup.tags.join();
      const group: EuiComboBoxOptionOption<string[]> = {
        label: `G: ${tagGroup.name}`,
        key: tagGroup.id,
        value: tagGroup.tags,
        title: _(msg`Tags: ${tagList}`),
      };

      return group;
    }),
  };

  let defaultGroupOptions: EuiComboBoxOptionOption<string> | undefined;
  let defaultTags: EuiComboBoxOptionOption<string>[] = [];

  if (!option.isDefault && !value.overrideDefault) {
    defaultTags = defaultOption.tags.map((tag) => ({
      value: tag,
      label: _(msg`(Default) ${tag}`),
      key: tag,
    }));

    defaultGroupOptions = {
      label: _(msg`Default Tags`),
      isGroupLabelOption: true,
      options: defaultTags.map((tag) => {
        const converter = tagConverters.find((c) => c.tag === tag.value);
        if (converter && converter.convertTo[account?.website ?? '']) {
          const originalTag = tag.value;
          const convertedTag = converter.convertTo[account?.website ?? ''];
          // eslint-disable-next-line no-param-reassign
          tag.label = _(msg`(Default) ${originalTag} → ${convertedTag}`);
        }

        return tag;
      }),
    };
  }

  const allChosenTags = uniqBy([...defaultTags, ...selectedTags], 'value');
  const options = defaultGroupOptions
    ? [defaultGroupOptions, tagOptions, tagGroupOptions]
    : [tagOptions, tagGroupOptions];

  return (
    <FormRow
      {...props}
      validations={validation}
      copyValue={value.tags.join(', ')}
    >
      {option.account !== NULL_ACCOUNT_ID ? (
        <EuiCheckbox
          id={`cb-${option.id}-${propKey}-override`}
          checked={overrideDefault}
          label={<Trans context="override-default">Override default</Trans>}
          onChange={(e) => {
            setOverrideDefault(e.target.checked);
            option.data[propKey] = {
              ...value,
              overrideDefault: e.target.checked,
            };
            onUpdate();
          }}
        />
      ) : null}
      <EuiComboBox
        aria-required={field.required}
        compressed
        isClearable
        fullWidth
        delimiter=","
        isInvalid={validation.isInvalid}
        options={options}
        selectedOptions={allChosenTags}
        onCreateOption={(searchValue) => {
          searchValue.split(',').forEach((v) => onCreate(v.trim()));
        }}
        onChange={(values) => {
          const extracted = uniq(
            values
              .map((tagValues) => {
                if (Array.isArray(tagValues.value)) {
                  return tagValues;
                }

                const opt = {
                  ...tagValues,
                  value: [tagValues.value],
                };

                return opt;
              })
              .flatMap((tagValues) => tagValues.value)
          ).map((flattenedTagValue) => ({
            key: flattenedTagValue,
            value: flattenedTagValue,
            label: flattenedTagValue,
          }));

          setSelectedTags(extracted);
          option.data[propKey] = {
            ...value,
            tags: extracted.map((v) => v.value) || [],
          };
          onUpdate();
        }}
      />
    </FormRow>
  );
}
