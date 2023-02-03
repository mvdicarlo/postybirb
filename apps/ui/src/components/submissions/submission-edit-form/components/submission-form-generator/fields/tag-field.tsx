import {
  EuiCheckbox,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { TagFieldType } from '@postybirb/form-builder';
import { TagValue } from '@postybirb/types';
import { uniq } from 'lodash';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { TagGroupStore } from '../../../../../../stores/tag-group-store';
import { useStore } from '../../../../../../stores/use-store';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';
import useValidations from './use-validations';

type TagFieldProps = SubmissionGeneratedFieldProps<TagFieldType>;

export default function TagField(props: TagFieldProps) {
  const { field, option, propKey, onUpdate } = props;
  const { state: tagGroupStore } = useStore(TagGroupStore);
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
    const foundTag = tags.find((t) => t.value === tagValue);
    if (foundTag) {
      setSelectedTags([...selectedTags, foundTag]);
    } else {
      const tag = {
        label: tagValue,
        key: tagValue,
        value: tagValue,
      };
      setTags([...tags, tag]);
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // TODO translate
  const tagOptions: EuiComboBoxOptionOption<string> = {
    label: 'Tags',
    isGroupLabelOption: true,
    options: tags,
  };

  const tagGroups = tagGroupStore.map((tagGroup) => {
    const group: EuiComboBoxOptionOption<string[]> = {
      label: `G: ${tagGroup.name}`,
      key: tagGroup.id,
      value: tagGroup.tags,
      title: `Tags: ${tagGroup.tags.join()}`,
    };

    return group;
  });

  // to satisfy component typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagGroupOptions: EuiComboBoxOptionOption<any> = {
    label: 'Tag Group',
    isGroupLabelOption: true,
    options: tagGroups,
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
              .flatMap((tagValues) => tagValues.value)
          ).map((flattenedTagValue) => ({
            key: flattenedTagValue,
            value: flattenedTagValue,
            label: flattenedTagValue,
          }));

          setSelectedTags(extracted);
          option.data[propKey] = {
            ...value,
            tags: extracted.map((v) => v.label) || [],
          };
          onUpdate();
        }}
      />
    </FormRow>
  );
}
