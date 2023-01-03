import { EuiCheckbox, EuiFormRow, EuiSwitch } from '@elastic/eui';
import { BooleanFieldType } from '@postybirb/form-builder';
import { useState } from 'react';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';

type InputFieldProps = SubmissionGeneratedFieldProps<BooleanFieldType>;

export default function BooleanField(props: InputFieldProps) {
  const { propKey, field, option, onUpdate } = props;
  const [value, setValue] = useState(
    option.data[propKey] ?? field.defaultValue
  );

  return (
    <EuiFormRow fullWidth>
      {field.formField === 'checkbox' ? (
        <EuiCheckbox
          id={`option-${option.id}-${propKey}`}
          label={field.label}
          aria-label={field.label}
          required={field.required}
          compressed
          checked={value}
          onChange={(e) => {
            option.data[propKey] = e.target.checked;
            setValue(e.target.checked);
            onUpdate();
          }}
        />
      ) : (
        <EuiSwitch
          id={`option-${option.id}-${propKey}`}
          label={field.label}
          aria-label={field.label}
          compressed
          checked={value}
          onChange={(e) => {
            option.data[propKey] = e.target.checked;
            setValue(e.target.checked);
            onUpdate();
          }}
        />
      )}
    </EuiFormRow>
  );
}
