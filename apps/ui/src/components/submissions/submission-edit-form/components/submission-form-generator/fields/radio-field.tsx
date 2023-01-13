import { EuiRadioGroup } from '@elastic/eui';
import { RadioFieldType, RatingFieldType } from '@postybirb/form-builder';
import { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';
import FormRow from '../form-row';
import { BaseWebsiteOptions } from '@postybirb/types';

type RadioFieldProps =
  | (
      | SubmissionGeneratedFieldProps<RadioFieldType>
      | SubmissionGeneratedFieldProps<RatingFieldType>
    ) & { key: string };

export default function RadioField(props: RadioFieldProps) {
  const { propKey, field, defaultOptions, option, onUpdate } = props;
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

  const defaultValue =
    defaultOptions !== option &&
    defaultOptions.data[propKey as keyof BaseWebsiteOptions] !== undefined
      ? defaultOptions.data[propKey as keyof BaseWebsiteOptions]
      : undefined;

  return (
    <FormRow {...props}>
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
