import {
  EuiCheckbox,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { TagFieldType } from '@postybirb/form-builder';
import { IBaseWebsiteOptions, TagValue } from '@postybirb/types';
import { uniq } from 'lodash';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { TagConverterStore } from '../../../../../../stores/tag-converter-store';
import { TagGroupStore } from '../../../../../../stores/tag-group-store';
import { useStore } from '../../../../../../stores/use-store';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';
import useValidations from './use-validations';
import useDefaultOption from './useDefaultOption';

type TagFieldProps = SubmissionGeneratedFieldProps<TagFieldType>;
// TODO display default tags if converting
export default function TagField(props: TagFieldProps) {
  const { account, field, option, propKey, onUpdate } = props;
  const { state: tagGroups } = useStore(TagGroupStore);
  const { state: tagConverters } = useStore(TagConverterStore);

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
    const tagUpdate = [...selectedTags];
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

  // TODO translate
  const tagOptions: EuiComboBoxOptionOption<string> = {
    label: 'Tags',
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
    label: 'Tag Group',
    isGroupLabelOption: true,
    options: tagGroups.map((tagGroup) => {
      const group: EuiComboBoxOptionOption<string[]> = {
        label: `G: ${tagGroup.name}`,
        key: tagGroup.id,
        value: tagGroup.tags,
        title: `Tags: ${tagGroup.tags.join()}`,
      };

      return group;
    }),
  };

  const options = [tagOptions, tagGroupOptions];

  return (
    <FormRow {...props} validations={validation}>
      {option.account ? (
        <EuiCheckbox
          id={`cb-${option.id}-${propKey}-override`}
          checked={overrideDefault}
          label={
            <FormattedMessage
              id="override-default"
              defaultMessage="Override default"
            />
          }
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
        fullWidth
        compressed
        isClearable
        isInvalid={validation.isInvalid}
        options={options}
        selectedOptions={selectedTags}
        onCreateOption={onCreate}
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
              .flatMap((tagValues) => tagValues.value.trim())
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
