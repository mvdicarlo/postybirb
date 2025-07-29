import {
  FieldAggregateType,
  SelectFieldType,
  SelectOption,
} from '@postybirb/form-builder';
import { ValidatorParams } from './validator.type';

function isSelectField(field: FieldAggregateType): field is SelectFieldType {
  return field.formField === 'select';
}

export async function validateSelectFieldMinSelected({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();
  for (const [fieldName, field] of Object.entries(fields)) {
    if (!isSelectField(field)) continue;

    const options = data.options[fieldName];
    const { minSelected } = field;
    if (!minSelected) continue;

    const selected = options?.length ?? 0;
    if (selected < minSelected) {
      result.errors.push({
        id: 'validation.select-field.min-selected',
        field: fieldName,
        values: {
          currentSelected: selected,
          minSelected,
        },
      });
    }
  }
}

/**
 * Validates that the selected value(s) for a select field are among the valid options.
 */
export async function validateSelectFieldValidOptions({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    if (!isSelectField(field)) continue;
    if (!field.options) continue;

    // Skip if field has no value
    if (
      data.options[fieldName] === undefined ||
      data.options[fieldName] === null
    ) {
      continue;
    }

    // Get the current value(s)
    const currentValue = data.options[fieldName];

    // Skip if no value
    if (
      currentValue === undefined ||
      currentValue === null ||
      currentValue === ''
    )
      continue;

    // Handle discriminator-based options differently (like overallFileType)
    if ('discriminator' in field.options) {
      // Skip validation for discriminator-based options as they're dynamically determined
      continue;
    }

    // Flatten all available options to a simple array of values
    const availableOptions = flattenSelectOptions(field.options);

    if (field.allowMultiple) {
      // For multi-select, validate each selected value
      if (Array.isArray(currentValue)) {
        const invalidOptions = currentValue.filter(
          (value) => !availableOptions.includes(value),
        );

        if (invalidOptions.length > 0) {
          result.errors.push({
            id: 'validation.select-field.invalid-option',
            field: fieldName,
            values: {
              invalidOptions,
              fieldName,
              fieldLabel: field.label,
            },
          });
        }
      }
    } else if (currentValue && !availableOptions.includes(currentValue)) {
      // For single-select, validate the selected value
      result.errors.push({
        id: 'validation.select-field.invalid-option',
        field: fieldName,
        values: {
          invalidOptions: [currentValue],
        },
      });
    }
  }
}

/**
 * Helper function to flatten nested select options into a single array of values
 */
function flattenSelectOptions(options: SelectOption[]): string[] {
  const result: string[] = [];

  for (const option of options) {
    if ('items' in option && Array.isArray(option.items)) {
      // This is a group of options
      for (const item of option.items) {
        if ('value' in item) {
          result.push(String(item.value));
        }
      }
    } else if ('value' in option) {
      // This is a single option
      result.push(String(option.value));
    }
  }

  return result;
}
