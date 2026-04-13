import { ValidatorParams } from './validator.type';

export async function validateMaxTags({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const { hidden, maxTags } = mergedWebsiteOptions.getFormFieldFor('tags');
  if (hidden) return;

  const { tags } = data.options;
  const maxLength = maxTags ?? Number.MAX_SAFE_INTEGER;

  if (tags.length > maxLength) {
    validator.warning(
      'validation.tags.max-tags',
      { maxLength, currentLength: tags.length },
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

  const { tags } = data.options;
  const maxLength = maxTagLength ?? Number.MAX_SAFE_INTEGER;
  const invalidTags = tags.filter((tag) => tag.length > maxLength);

  if (invalidTags.length > 0) {
    validator.warning(
      'validation.tags.max-tag-length',
      { tags: invalidTags, maxLength },
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

export async function validateTagsPresence({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const { hidden, expectedInDescription } =
    mergedWebsiteOptions.getFormFieldFor('tags');
  const { tags, description } = data.options;

  if (hidden || !description || !tags.length) return;

  const presentTags = tags.filter((e) => description.includes(`#${e}`));

  if (expectedInDescription) {
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
