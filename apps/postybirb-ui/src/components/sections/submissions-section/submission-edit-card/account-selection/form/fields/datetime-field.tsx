/**
 * DateTimeField - Date/time picker field.
 */

import { DateTimeFieldType } from '@postybirb/form-builder';
import { IconCalendar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useLocale } from '../../../../../../../hooks/use-locale.js';
import { DateTimePickerWithLocalization } from '../../../../../../shared/index.js';
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
  const { getValue, setValue, submission } = useFormFieldsContext();

  const value = getValue<string>(fieldName) ?? field.defaultValue ?? '';
  const dateValue = value ? dayjs(value).toDate() : null;

  const minDate = field.min ? dayjs(field.min).toDate() : undefined;
  const maxDate = field.max ? dayjs(field.max).toDate() : undefined;

  const { dayjsDateTimeFormat: dateTimeFormat } = useLocale();

  const format = field.format || dateTimeFormat;

  return (
    <DateTimePickerWithLocalization
      rightSection={<IconCalendar />}
      value={dateValue}
      disabled={submission.isArchived}
      valueFormat={format}
      onChange={(date) => {
        if (date) {
          setValue(fieldName, date);
        } else {
          setValue(fieldName, '');
        }
      }}
      placeholder={
        defaultValue ? dayjs(defaultValue).format(format) : undefined
      }
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
