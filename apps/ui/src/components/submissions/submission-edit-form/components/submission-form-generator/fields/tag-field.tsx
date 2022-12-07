import {
  EuiCheckbox,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { TagFieldType } from '@postybirb/form-builder';
import { TagValue } from '@postybirb/types';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';

type TagFieldProps = SubmissionGeneratedFieldProps<TagFieldType>;

export default function TagField(props: TagFieldProps) {
  const { field, option, propKey, onUpdate } = props;
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

  return (
    <FormRow {...props}>
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
        options={tags}
        selectedOptions={selectedTags}
        onCreateOption={onCreate}
        onChange={(values) => {
          setSelectedTags(values);
          option.data[propKey] = {
            ...value,
            tags: values.map((v) => v.label) || [],
          };
          onUpdate();
        }}
      />
    </FormRow>
  );
}
