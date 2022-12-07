import { EuiFieldText, EuiTextArea } from '@elastic/eui';
import { TextFieldType } from '@postybirb/form-builder';
import { useState } from 'react';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';

type InputFieldProps = SubmissionGeneratedFieldProps<TextFieldType>;

export default function InputField(props: InputFieldProps) {
  const { propKey, field, option, onUpdate } = props;
  const [value, setValue] = useState(
    option.data[propKey] || field.defaultValue
  );

  return (
    <FormRow {...props}>
      {field.formField === 'input' ? (
        <EuiFieldText
          required={field.required}
          fullWidth
          compressed
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onBlur={(e) => {
            option.data[propKey] = e.target.value;
            setValue(e.target.value);
            onUpdate();
          }}
        />
      ) : (
        <EuiTextArea
          required={field.required}
          fullWidth
          compressed
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onBlur={(e) => {
            option.data[propKey] = e.target.value;
            setValue(e.target.value);
            onUpdate();
          }}
        />
      )}
    </FormRow>
  );
}
