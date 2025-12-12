/**
 * DateTimeField - Date/time picker field.
 */

import { DateTimePicker } from '@mantine/dates';
import { DateTimeFieldType } from '@postybirb/form-builder';
import { IconCalendar } from '@tabler/icons-react';
import moment from 'moment';
import { useFormFieldsContext } from '../form-fields-context';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

function DateTimePickerField({
  fieldName,
  field,
  defaultValue,
}: FormFieldProps<DateTimeFieldType> & { defaultValue: string | undefined }) {
  const { getValue, setValue } = useFormFieldsContext();

  const value = getValue<string>(fieldName) ?? field.defaultValue ?? '';
  const dateValue = value ? moment(value).toDate() : null;

  const minDate = field.min ? moment(field.min).toDate() : undefined;
  const maxDate = field.max ? moment(field.max).toDate() : undefined;

  return (
    <DateTimePicker
      rightSection={<IconCalendar />}
      value={dateValue}
      onChange={(date) => {
        if (date) {
          setValue(fieldName, moment(date).toISOString());
        } else {
          setValue(fieldName, '');
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

export function DateTimeField({
  fieldName,
  field,
}: FormFieldProps<DateTimeFieldType>) {
  const defaultValue = useDefaultOption<string>(fieldName);
  const validations = useValidations(fieldName);

  return (
    <FieldLabel
      field={field}
      fieldName={fieldName}
      validationState={validations}
    >
      <DateTimePickerField
        fieldName={fieldName}
        field={field}
        defaultValue={defaultValue}
      />
    </FieldLabel>
  );
}
