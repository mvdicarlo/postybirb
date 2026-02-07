import { ValidatorParams } from './validator.type';

export async function validateMaxTags({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const tagField = mergedWebsiteOptions.getFormFieldFor('tags');
  if (tagField.hidden !== true) {
    const { tags } = data.options;
    const maxLength = tagField.maxTags ?? Number.MAX_SAFE_INTEGER;
    if (tags.length > maxLength) {
      result.warnings.push({
        id: 'validation.tags.max-tags',
        field: 'tags',
        values: {
          currentLength: tags.length,
          maxLength,
        },
      });
    }
  }
}

export async function validateMinTags({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const tagField = mergedWebsiteOptions.getFormFieldFor('tags');
  if (tagField.hidden !== true) {
    const { tags } = data.options;
    const minLength = tagField.minTags ?? -1;
    if (tags.length < minLength) {
      result.errors.push({
        id: 'validation.tags.min-tags',
        field: 'tags',
        values: {
          currentLength: tags.length,
          minLength,
        },
      });
    }
  }
}

export async function validateMaxTagLength({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const tagField = mergedWebsiteOptions.getFormFieldFor('tags');
  if (tagField.hidden !== true) {
    const { tags } = data.options;
    const maxLength = tagField.maxTagLength ?? Number.MAX_SAFE_INTEGER;
    const invalidTags = tags.filter((tag) => tag.length > maxLength);
    if (invalidTags.length > 0) {
      result.warnings.push({
        id: 'validation.tags.max-tag-length',
        field: 'tags',
        values: {
          tags: invalidTags,
          maxLength,
        },
      });
    }
  }
}

export async function validateTagCashtag({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const tagField = mergedWebsiteOptions.getFormFieldFor('tags');
  if (tagField.hidden !== true) {
    const { tags } = data.options;
    const invalidTags = tags.filter((tag) => tag.startsWith('#'));
    if (invalidTags.length > 0) {
      result.warnings.push({
        id: 'validation.tags.double-cashtag',
        field: 'tags',
        values: {
          tags: invalidTags,
        },
      });
    }
  }
}
