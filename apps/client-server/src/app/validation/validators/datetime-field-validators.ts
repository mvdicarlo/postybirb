import { ValidatorParams } from './validator.type';

/**
 * Validates that a datetime field value is a valid ISO date string.
 */
export async function validateDateTimeFormat({
  data,
  mergedWebsiteOptions,
  validator,
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
      validator.error(
        'validation.datetime.invalid-format',
        { value },
        fieldName,
      );
    }
  }
}

/**
 * Validates that a datetime field value is not before the minimum allowed date.
 */
export async function validateDateTimeMinimum({
  data,
  mergedWebsiteOptions,
  validator,
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
      validator.error(
        'validation.datetime.min',
        {
          currentDate: value,
          minDate: field.min,
        },
        fieldName,
      );
    }
  }
}

/**
 * Validates that a datetime field value is not after the maximum allowed date.
 */
export async function validateDateTimeMaximum({
  data,
  mergedWebsiteOptions,
  validator,
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
      validator.error(
        'validation.datetime.max',
        {
          currentDate: value,
          maxDate: field.max,
        },
        fieldName,
      );
    }
  }
}

/**
 * Validates that a datetime field value is within the allowed range (min and max).
 * This is a convenience validator that checks both min and max constraints.
 */
export async function validateDateTimeRange({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is hidden
    if (field.hidden) continue;

    // Only check datetime fields
    if (field.formField !== 'datetime') continue;

    // Skip if no range constraints
    if (!('min' in field && field.min) || !('max' in field && field.max)) {
      continue;
    }

    const value = data.options[fieldName] as string;

    // Skip if no value
    if (!value || value.trim() === '') continue;

    const date = new Date(value);
    const minDate = new Date(field.min);
    const maxDate = new Date(field.max);

    // Skip if date is invalid (handled by format validator)
    if (Number.isNaN(date.getTime())) continue;

    if (date < minDate || date > maxDate) {
      validator.error(
        'validation.datetime.range',
        {
          currentDate: value,
          minDate: field.min,
          maxDate: field.max,
        },
        fieldName,
      );
    }
  }
}
