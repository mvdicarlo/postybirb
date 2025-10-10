/* eslint-disable lingui/no-unlocalized-strings */
import { DateTimePicker } from '@mantine/dates';
import { DateTimeFieldType } from '@postybirb/form-builder';
import { IconCalendar } from '@tabler/icons-react';
import moment from 'moment';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { useFormFields } from '../website-option-form/use-form-fields';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

type CommonFieldProps = {
  defaultValue: string | undefined;
};

function DateTimePickerField(
  props: FormFieldProps<DateTimeFieldType> & CommonFieldProps,
) {
  const { propKey, field, defaultValue } = props;
  const { values, setFieldValue } = useFormFields();

  // Get the value from form state or default
  const value: string =
    (values[propKey] as string) ?? (field.defaultValue || '');

  // Convert string value to Date object for DateTimePicker
  const dateValue = value ? moment(value).toDate() : null;

  // Convert min/max to Date objects if provided
  const minDate = field.min ? moment(field.min).toDate() : undefined;
  const maxDate = field.max ? moment(field.max).toDate() : undefined;

  return (
    <DateTimePicker
      rightSection={<IconCalendar />}
      value={dateValue}
      onChange={(date) => {
        // Convert Date to ISO string when storing
        if (date) {
          setFieldValue(propKey, moment(date).toISOString());
        } else {
          setFieldValue(propKey, '');
        }
      }}
      placeholder={
        defaultValue
          ? moment(defaultValue).format(field.format || 'YYYY-MM-DD HH:mm')
          : undefined
      }
      valueFormat={field.format || 'YYYY-MM-DD HH:mm'}
      withSeconds={false}
      minDate={minDate}
      maxDate={maxDate}
      clearable
      w="100%"
      required={field.required}
    />
  );
}

export function DateTimeField(props: FormFieldProps<DateTimeFieldType>) {
  const defaultValue = useDefaultOption<string>(props);
  const { errors, warnings, isInvalid } = useValidations(props);

  return (
    <FieldLabel {...props} validationState={{ errors, warnings, isInvalid }}>
      <DateTimePickerField {...props} defaultValue={defaultValue} />
    </FieldLabel>
  );
}
