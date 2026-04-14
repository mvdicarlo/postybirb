import { DescriptionType } from '@postybirb/types';
import { ValidatorParams } from './validator.type';

export async function validateDescriptionMaxLength({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const { hidden, descriptionType, maxDescriptionLength } =
    mergedWebsiteOptions.getFormFieldFor('description');

  if (
    descriptionType === undefined ||
    descriptionType === DescriptionType.NONE ||
    hidden
  ) {
    return;
  }

  const { description } = data.options;
  const maxLength = maxDescriptionLength ?? Number.MAX_SAFE_INTEGER;
  if (description.length > maxLength) {
    validator.warning(
      'validation.description.max-length',
      { currentLength: description.length, maxLength },
      'description',
    );
  }
}

export async function validateDescriptionMinLength({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const { hidden, descriptionType, minDescriptionLength } =
    mergedWebsiteOptions.getFormFieldFor('description');

  if (
    descriptionType === undefined ||
    descriptionType === DescriptionType.NONE ||
    hidden
  ) {
    return;
  }

  const { description } = data.options;
  const minLength = minDescriptionLength ?? -1;
  if (description.length < minLength) {
    validator.error(
      'validation.description.min-length',
      { minLength, currentLength: description.length },
      'description',
    );
  }
}

export async function validateTagsPresence({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const tagsField = mergedWebsiteOptions.getFormFieldFor('tags');
  const descriptionField = mergedWebsiteOptions.getFormFieldFor('description');
  const { tags, description } = data.options;

  if (tagsField.hidden || descriptionField.hidden) return;
  if (!description || !tags.length) return;

  const presentTags = tags.filter((e) => description.includes(`#${e}`));

  if (descriptionField.expectsInlineTags) {
    if (presentTags.length === 0) {
      // Tags are missing in the description
      validator.warning(
        'validation.description.missing-tags',
        {},
        'description',
      );
    }
  } else if (presentTags.length === tags.length) {
    // All tags are in description
    validator.warning(
      'validation.description.unexpected-tags',
      {},
      'description',
    );
  }
}

export async function validateTitlePresence({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const titleField = mergedWebsiteOptions.getFormFieldFor('tags');
  const descriptionField = mergedWebsiteOptions.getFormFieldFor('description');
  const { title, description } = data.options;

  if (titleField.hidden || descriptionField.hidden) return;
  if (!description || !title) return;

  const hasTitleText = description.includes(title);

  if (descriptionField.expectsInlineTitle) {
    if (!hasTitleText) {
      // Title is missing in the description
      validator.warning(
        'validation.description.missing-title',
        {},
        'description',
      );
    }
  } else if (hasTitleText) {
    // Title is in the description
    validator.warning(
      'validation.description.unexpected-title',
      {},
      'description',
    );
  }
}
