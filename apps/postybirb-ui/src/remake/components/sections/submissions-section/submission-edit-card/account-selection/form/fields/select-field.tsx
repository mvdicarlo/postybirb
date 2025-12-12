/**
 * SelectField - Select/multi-select dropdown field.
 */

import { Select as MantineSelect, MultiSelect } from '@mantine/core';
import {
    SelectFieldType,
    SelectOption,
} from '@postybirb/form-builder';
import { getFileType } from '@postybirb/utils/file-type';
import { useFormFieldsContext } from '../form-fields-context';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

function getSelectOptions(
  options: SelectFieldType['options'],
  submission: {
    isMultiSubmission: boolean;
    isTemplate: boolean;
    files: { fileName: string }[];
  },
): SelectOption[] {
  if (!options) return [];

  if (Array.isArray(options)) return options;

  // Discriminator based select options
  const { options: allOptions, discriminator } = options;
  if (submission.isMultiSubmission || submission.isTemplate) {
    const groupedOptions: SelectOption[] = [];
    Object.entries(allOptions).forEach(([, opts]) => {
      groupedOptions.push(...opts);
    });
    return groupedOptions;
  }

  if (discriminator === 'overallFileType') {
    const fileType = getFileType(submission.files[0]?.fileName || '');
    return allOptions[fileType] || [];
  }

  return [];
}

function flattenOptions(
  options: SelectOption[],
): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];

  for (const option of options) {
    if ('items' in option) {
      // Group - flatten children
      result.push(...flattenOptions(option.items));
    } else {
      result.push({
        value:
          typeof option.value === 'string'
            ? option.value
            : JSON.stringify(option.value),
        label: option.label,
      });
    }
  }

  return result;
}

export function SelectField({
  fieldName,
  field,
}: FormFieldProps<SelectFieldType>) {
  const { getValue, setValue, submission } = useFormFieldsContext();
  const validations = useValidations(fieldName);

  const value =
    getValue<string | string[]>(fieldName) ?? field.defaultValue ?? '';
  const selectOptions = getSelectOptions(field.options, submission);
  const flatOptions = flattenOptions(selectOptions);

  if (field.allowMultiple) {
    const multiValue = Array.isArray(value) ? value : [];

    return (
      <FieldLabel
        field={field}
        fieldName={fieldName}
        validationState={validations}
      >
        <MultiSelect
          data={flatOptions}
          value={multiValue}
          onChange={(values) => setValue(fieldName, values)}
          clearable
          searchable
        />
      </FieldLabel>
    );
  }

  const singleValue = typeof value === 'string' ? value : '';

  return (
    <FieldLabel
      field={field}
      fieldName={fieldName}
      validationState={validations}
    >
      <MantineSelect
        data={flatOptions}
        value={singleValue}
        onChange={(val) => setValue(fieldName, val)}
        clearable
        searchable
      />
    </FieldLabel>
  );
}
