import { ValidatorParams } from './validator.type';

export async function validateMaxTags({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const { hidden, maxTags } = mergedWebsiteOptions.getFormFieldFor('tags');
  if (hidden) return;
  if (typeof maxTags === 'undefined') return;

  const { tags } = data.options;

  if (tags.length > maxTags) {
    validator.warning(
      'validation.tags.max-tags',
      { maxLength: maxTags, currentLength: tags.length },
      'tags',
    );
  }
}

export async function validateMinTags({
  data,
  validator,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const tagField = mergedWebsiteOptions.getFormFieldFor('tags');
  if (tagField.hidden) return;

  const { tags } = data.options;
  const minLength = tagField.minTags ?? -1;

  if (tags.length < minLength) {
    validator.error(
      'validation.tags.min-tags',
      { currentLength: tags.length, minLength },
      'tags',
    );
  }
}

export async function validateMaxTagLength({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const { hidden, maxTagLength } = mergedWebsiteOptions.getFormFieldFor('tags');
  if (hidden) return;
  if (typeof maxTagLength === 'undefined') return;

  const { tags } = data.options;
  const invalidTags = tags.filter((tag) => tag.length > maxTagLength);

  if (invalidTags.length > 0) {
    validator.warning(
      'validation.tags.max-tag-length',
      { tags: invalidTags, maxLength: maxTagLength },
      'tags',
    );
  }
}

export async function validateTagHashtag({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const { hidden } = mergedWebsiteOptions.getFormFieldFor('tags');
  if (hidden) return;

  const { tags } = data.options;
  const invalidTags = tags.filter((tag) => tag.startsWith('#'));

  if (invalidTags.length > 0) {
    validator.error(
      'validation.tags.double-hashtag',
      { tags: invalidTags },
      'tags',
    );
  }
}
