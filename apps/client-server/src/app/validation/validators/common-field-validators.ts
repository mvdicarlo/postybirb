import { DescriptionValue, TagValue } from '@postybirb/types';
import { ValidatorParams } from './validator.type';

/**
 * Validates that a required text field (input/textarea) is not empty.
 */
export async function validateRequiredTextField({
  result,
  data,
  mergedWebsiteOptions,
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
      result.errors.push({
        id: 'validation.field.required',
        field: fieldName,
        values: {},
      });
    }
  }
}

/**
 * Validates that a required select field has a value selected.
 */
export async function validateRequiredSelectField({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is not required or hidden
    if (!field.required || field.hidden) continue;

    // Only check select fields
    if (field.formField !== 'select') continue;

    const value = data.options[fieldName];
    const isEmpty = Array.isArray(value) ? value.length === 0 : !value;

    if (isEmpty) {
      result.errors.push({
        id: 'validation.field.required',
        field: fieldName,
        values: {},
      });
    }
  }
}

/**
 * Validates that a required radio field has a value selected.
 */
export async function validateRequiredRadioField({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is not required or hidden
    if (!field.required || field.hidden) continue;

    // Only check radio fields (includes rating fields)
    if (field.formField !== 'radio' && field.formField !== 'rating') continue;

    const value = data.options[fieldName];

    if (!value) {
      result.errors.push({
        id: 'validation.field.required',
        field: fieldName,
        values: {},
      });
    }
  }
}

/**
 * Validates that a required boolean field (checkbox) is checked.
 */
export async function validateRequiredBooleanField({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is not required or hidden
    if (!field.required || field.hidden) continue;

    // Only check checkbox fields
    if (field.formField !== 'checkbox') continue;

    const value = data.options[fieldName] as boolean;

    if (typeof value !== 'boolean') {
      result.errors.push({
        id: 'validation.field.required',
        field: fieldName,
        values: {},
      });
    }
  }
}

/**
 * Validates that a required description field has content.
 */
export async function validateRequiredDescriptionField({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is not required or hidden
    if (!field.required || field.hidden) continue;

    // Only check description fields
    if (field.formField !== 'description') continue;

    // Description field value structure
    const value = fields.description as unknown as DescriptionValue;

    if (!value || !value.description || value.description.length === 0) {
      result.errors.push({
        id: 'validation.field.required',
        field: fieldName,
        values: {},
      });
    }
  }
}

/**
 * Validates that a required tag field has at least one tag.
 */
export async function validateRequiredTagField({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const fields = mergedWebsiteOptions.getFormFields();

  for (const [fieldName, field] of Object.entries(fields)) {
    // Skip if field is not required or hidden
    if (!field.required || field.hidden) continue;

    // Only check tag fields
    if (field.formField !== 'tag') continue;

    const { tags } = fields.tags as unknown as TagValue;

    if (!tags || tags.length === 0) {
      result.errors.push({
        id: 'validation.field.required',
        field: fieldName,
        values: {},
      });
    }
  }
}
