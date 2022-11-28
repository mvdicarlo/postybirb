import { EuiRadioGroup } from '@elastic/eui';
import { RadioFieldType } from '@postybirb/form-builder';
import { useState } from 'react';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';

type RadioFieldProps = SubmissionGeneratedFieldProps<RadioFieldType>;

export default function RadioField(props: RadioFieldProps) {
  const { propKey, field, option, onUpdate } = props;
  const [value, setValue] = useState(
    option.data[propKey] || field.defaultValue
  );

  return (
    <FormRow {...props}>
      <EuiRadioGroup
        aria-required={field.required}
        compressed
        style={{
          display: 'flex',
          gap: '1em',
        }}
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
    </FormRow>
  );
}
