import { EuiRadioGroup } from '@elastic/eui';
import { RadioFieldType, RatingFieldType } from '@postybirb/form-builder';
import { useMemo, useState } from 'react';
import classNames from 'classnames';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';

type RadioFieldProps =
  | SubmissionGeneratedFieldProps<RadioFieldType>
  | SubmissionGeneratedFieldProps<RatingFieldType>;

export default function RadioField(props: RadioFieldProps) {
  const { propKey, field, option, onUpdate } = props;
  const [value, setValue] = useState(
    option.data[propKey] || field.defaultValue
  );

  const options = useMemo(
    () =>
      field.formField === 'rating' && !option.isDefault
        ? [{ label: 'Default', value: undefined }, ...field.options]
        : field.options,
    [field.formField, field.options, option.isDefault]
  );

  return (
    <FormRow {...props}>
      <EuiRadioGroup
        aria-required={field.required}
        compressed
        className={classNames({
          'postybirb__radio-horizontal': field.layout === 'horizontal',
        })}
        options={options.map((o) => ({
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
