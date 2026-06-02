import { ValidatorParams } from './validator.type';

/**
 * Validates that a required text field (input/textarea) is not empty.
 */
export async function validateRequiredTextField({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is not required or hidden
    if (!field.required || field.hidden) continue;

    // Only check text field types (includes title, content warning etc.)
    if (field.formField !== 'input' && field.formField !== 'textarea') continue;

    // Check if the field is a title field
    // Check if the field is a content warning field
    if (
      (field.formField === 'input' && field.label === 'title') ||
      (field.formField === 'input' && field.label === 'contentWarning')
    ) {
      continue;
    }

    const value = data.options[fieldName] as string;

    // Check if the value is empty
    if (!value || value.trim() === '') {
      validator.error('validation.field.required', {}, fieldName);
    }
  }
}

/**
 * Validates that a required select field has a value selected.
 */
export async function validateRequiredSelectField({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is not required or hidden
    if (!field.required || field.hidden) continue;

    // Only check select fields
    if (field.formField !== 'select') continue;

    // Skip fields with min selected, they gets handled by selectFieldValidator
    if ('minSelected' in field && typeof field.minSelected === 'number')
      continue;

    const value = data.options[fieldName];
    const isEmpty = Array.isArray(value) ? value.length === 0 : !value;

    if (isEmpty) {
      validator.error('validation.field.required', {}, fieldName);
    }
  }
}

/**
 * Validates that a required radio field has a value selected.
 */
export async function validateRequiredRadioField({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is not required or hidden
    if (!field.required || field.hidden) continue;

    // Only check radio fields (includes rating fields)
    if (field.formField !== 'radio' && field.formField !== 'rating') continue;

    const value = data.options[fieldName];

    if (!value) {
      validator.error('validation.field.required', {}, fieldName);
    }
  }
}

/**
 * Validates that a required boolean field (checkbox) is checked.
 */
export async function validateRequiredBooleanField({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is not required or hidden
    if (!field.required || field.hidden) continue;

    // Only check checkbox fields
    if (field.formField !== 'checkbox') continue;

    const value = data.options[fieldName] as boolean;

    if (typeof value !== 'boolean') {
      validator.error('validation.field.required', {}, fieldName);
    }
  }
}

/**
 * Validates that a required description field has content.
 */
export async function validateRequiredDescriptionField({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is not required or hidden
    if (!field.required || field.hidden) continue;

    // Only check description fields
    if (field.formField !== 'description') continue;

    // Description field value structure
    let value: string = data.options[fieldName] || '';
    value = value.replaceAll('<div></div>', '').trim();

    if (!value || value.length === 0) {
      validator.error('validation.field.required', {}, fieldName);
    }
  }
}
