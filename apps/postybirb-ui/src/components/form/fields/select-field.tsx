import { SelectFieldType, SelectOption } from '@postybirb/form-builder';
import { getFileType } from '@postybirb/utils/file-type';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { useValidations } from '../hooks/use-validations';
import { useFormFields } from '../website-option-form/use-form-fields';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';
import { Select } from './select';

function getSelectOptions(
  options: SelectFieldType['options'],
  submission: SubmissionDto,
): SelectOption[] {
  if (!options) {
    return [];
  }

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

  // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
  console.warn('No discriminator found for select options');
  return [];
}

function ensureStringOption(options: SelectOption[]): void {
  options.forEach((o) => {
    if ('items' in o) {
      ensureStringOption(o.items);
    } else if (typeof o.value !== 'string') {
      // eslint-disable-next-line no-param-reassign
      o.value = JSON.stringify(o.value);
    }
  });
}

export function SelectField(props: FormFieldProps<SelectFieldType>) {
  const { field, propKey, submission } = props;
  const { values, setFieldValue } = useFormFields();
  const validations = useValidations(props);

  // Get the value from context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = (values[propKey] || field.defaultValue || '') as any;
  const selectOptions = getSelectOptions(field.options, submission);
  ensureStringOption(selectOptions);

  return (
    <FieldLabel {...props} validationState={validations}>
      <Select
        multiple={field.allowMultiple}
        value={value}
        options={selectOptions}
        onChange={(options) => {
          if (Array.isArray(options)) {
            setFieldValue(
              propKey,
              options.map((o) => o.value),
            );
          } else {
            setFieldValue(propKey, options?.value);
          }
        }}
      />
    </FieldLabel>
  );
}
