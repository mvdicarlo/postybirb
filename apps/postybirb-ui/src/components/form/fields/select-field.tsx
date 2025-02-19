import { MultiSelect, Select } from '@mantine/core';
import { SelectFieldType, SelectOption } from '@postybirb/form-builder';
import { getFileType } from '@postybirb/utils/file-type';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

function getSelectOptions(
  options: SelectFieldType['options'],
  submission: SubmissionDto,
): SelectOption[] {
  if (Array.isArray(options)) {
    return options;
  }

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
    const fileType = getFileType(submission.files[0].fileName);
    return allOptions[fileType];
  }

  // eslint-disable-next-line lingui/no-unlocalized-strings
  console.warn('No discriminator found for select options');
  return [];
}

function ensureStringOption(options: SelectOption[]): void {
  options.forEach((o) => {
    if ('group' in o) {
      ensureStringOption(o.items);
    } else if (typeof o.value !== 'string') {
      // eslint-disable-next-line no-param-reassign
      o.value = JSON.stringify(o.value);
    }
  });
}

export function SelectField(props: FormFieldProps<SelectFieldType>) {
  const { field, form, propKey, submission } = props;
  const validations = useValidations(props);
  const valueProps = form.getInputProps(propKey);

  const options = getSelectOptions(field.options, submission);
  ensureStringOption(options);
  return (
    <FieldLabel {...props} validationState={validations}>
      {field.allowMultiple ? (
        <MultiSelect
          clearable
          required={field.required}
          {...valueProps}
          data={options}
        />
      ) : (
        <Select
          clearable
          required={field.required}
          {...valueProps}
          data={options}
        />
      )}
    </FieldLabel>
  );
}
