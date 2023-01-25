import { EuiRadioGroup } from '@elastic/eui';
import { RadioFieldType, RatingFieldType } from '@postybirb/form-builder';
import classNames from 'classnames';
import { useCallback, useMemo, useState } from 'react';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';
import useValidations from './use-validations';
import useDefaultOption from './useDefaultOption';

type RadioFieldProps =
  | (
      | SubmissionGeneratedFieldProps<RadioFieldType>
      | SubmissionGeneratedFieldProps<RatingFieldType>
    ) & { key: string };

export default function RadioField(props: RadioFieldProps) {
  const { propKey, field, option, onUpdate } = props;
  const validation = useValidations(props);
  const defaultValue = useDefaultOption(props);
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

  const onChange = useCallback((changeValue: string | undefined) => {
    option.data[propKey] = changeValue;
    setValue(changeValue);
    onUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FormRow {...props} validations={validation}>
      <EuiRadioGroup
        aria-required={field.required}
        compressed
        className={classNames({
          'postybirb__radio-horizontal': field.layout === 'horizontal',
        })}
        options={options.map((o) => ({
          label: `${o.label}${
            defaultValue !== undefined &&
            o.value &&
            o.value.toString() === defaultValue
              ? ` *`
              : ''
          }`,
          id: `${option.id}-${propKey}-${o.value?.toString() || 'undefined'}`,
          value: o.value ? o.value.toString() : undefined,
        }))}
        idSelected={`${option.id}-${propKey}-${value}`}
        onChange={(_, newValue) => {
          onChange(newValue);
        }}
        name={`option-${option.id}-${propKey}`}
      />
    </FormRow>
  );
}
