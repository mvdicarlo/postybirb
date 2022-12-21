import { EuiCheckbox, EuiTextArea } from '@elastic/eui';
import { DescriptionFieldType } from '@postybirb/form-builder';
import { DescriptionValue } from '@postybirb/types';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';

type DescriptionFieldProps =
  SubmissionGeneratedFieldProps<DescriptionFieldType>;

export default function DescriptionField(props: DescriptionFieldProps) {
  const { propKey, field, option, onUpdate } = props;
  const value: DescriptionValue = option.data[propKey] ?? field.defaultValue;
  const [overrideDefault, setOverrideDefault] = useState<boolean>(
    value.overrideDefault
  );
  const [description, setDescription] = useState<string>(
    value.description || ''
  );

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
      {overrideDefault ? (
        <EuiTextArea
          required={field.required}
          fullWidth
          compressed
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          onBlur={(e) => {
            option.data[propKey] = e.target.value;
            setDescription(e.target.value);
            onUpdate();
          }}
        />
      ) : null}
    </FormRow>
  );
}
