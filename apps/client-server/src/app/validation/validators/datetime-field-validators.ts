import { ValidatorParams } from './validator.type';

/**
 * Validates that a datetime field value is a valid ISO date string.
 */
export async function validateDateTimeFormat({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is hidden
    if (field.hidden) continue;

    // Only check datetime fields
    if (field.formField !== 'datetime') continue;

    const value = data.options[fieldName] as string;

    // Skip if no value (empty is handled by required validator)
    if (!value || value.trim() === '') continue;

    // Try to parse as ISO date string
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      result.errors.push({
        id: 'validation.datetime.invalid-format',
        field: fieldName,
        values: {
          value,
        },
      });
    }
  }
}

/**
 * Validates that a datetime field value is not before the minimum allowed date.
 */
export async function validateDateTimeMinimum({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is hidden
    if (field.hidden) continue;

    // Only check datetime fields
    if (field.formField !== 'datetime') continue;

    // Skip if no min constraint
    if (!('min' in field) || !field.min) continue;

    const value = data.options[fieldName] as string;

    // Skip if no value
    if (!value || value.trim() === '') continue;

    const date = new Date(value);
    const minDate = new Date(field.min);

    // Skip if date is invalid (handled by format validator)
    if (Number.isNaN(date.getTime())) continue;

    if (date < minDate) {
      result.errors.push({
        id: 'validation.datetime.min',
        field: fieldName,
        values: {
          currentDate: value,
          minDate: field.min,
        },
      });
    }
  }
}

/**
 * Validates that a datetime field value is not after the maximum allowed date.
 */
export async function validateDateTimeMaximum({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is hidden
    if (field.hidden) continue;

    // Only check datetime fields
    if (field.formField !== 'datetime') continue;

    // Skip if no max constraint
    if (!('max' in field) || !field.max) continue;

    const value = data.options[fieldName] as string;

    // Skip if no value
    if (!value || value.trim() === '') continue;

    const date = new Date(value);
    const maxDate = new Date(field.max);

    // Skip if date is invalid (handled by format validator)
    if (Number.isNaN(date.getTime())) continue;

    if (date > maxDate) {
      result.errors.push({
        id: 'validation.datetime.max',
        field: fieldName,
        values: {
          currentDate: value,
          maxDate: field.max,
        },
      });
    }
  }
}

/**
 * Validates that a datetime field value is within the allowed range (min and max).
 * This is a convenience validator that checks both min and max constraints.
 */
export async function validateDateTimeRange({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is hidden
    if (field.hidden) continue;

    // Only check datetime fields
    if (field.formField !== 'datetime') continue;

    // Skip if no range constraints
    const hasMin = 'min' in field && field.min;
    const hasMax = 'max' in field && field.max;
    if (!hasMin || !hasMax) continue;

    const value = data.options[fieldName] as string;

    // Skip if no value
    if (!value || value.trim() === '') continue;

    const date = new Date(value);
    const minDate = new Date(field.min);
    const maxDate = new Date(field.max);

    // Skip if date is invalid (handled by format validator)
    if (Number.isNaN(date.getTime())) continue;

    if (date < minDate || date > maxDate) {
      result.errors.push({
        id: 'validation.datetime.range',
        field: fieldName,
        values: {
          currentDate: value,
          minDate: field.min,
          maxDate: field.max,
        },
      });
    }
  }
}
