import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { RadioFieldType } from '@postybirb/form-builder';
import { useState } from 'react';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RadioFieldProps = SubmissionGeneratedFieldProps<RadioFieldType<any>>;

export default function RadioField(props: RadioFieldProps) {
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
      <EuiRadioGroup
        style={{
          display: 'flex',
          gap: '1em',
        }}
        compressed
        options={field.options.map((o) => ({
          label: o.label,
          id: o.value?.toString() || 'undefined',
          value: o.value?.toString(),
        }))}
        idSelected={value}
        onChange={(_, newValue) => {
          option.data[propKey] = newValue;
          setValue(newValue);
          onUpdate();
        }}
        name={`option-${option.id}-${propKey}`}
      />
    </EuiFormRow>
  );
}
