import { EuiFormRow, EuiFieldText, EuiTextArea } from '@elastic/eui';
import { TextFieldType } from '@postybirb/form-builder';
import { useState } from 'react';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InputFieldProps = SubmissionGeneratedFieldProps<TextFieldType<any>>;

export default function InputField(props: InputFieldProps) {
  const { propKey, field, option, onUpdate } = props;
  const [value, setValue] = useState(
    option.data[propKey] || field.defaultValue
  );

  return (
    <EuiFormRow
      fullWidth={!option.account}
      id={`option-${option.id}-${propKey}`}
      label={field.label}
      aria-label={field.label}
    >
      {field.formField === 'input' ? (
        <EuiFieldText
          fullWidth={!option.account}
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
          fullWidth={!option.account}
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
    </EuiFormRow>
  );
}
