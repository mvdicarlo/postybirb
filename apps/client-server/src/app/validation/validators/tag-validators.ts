import { ValidatorParams } from './validator.type';

export async function validateMaxTags({
  result,
  websiteInstance,
  data,
}: ValidatorParams) {
  const { tagSupport } = websiteInstance.decoratedProps;
  if (tagSupport?.supportsTags === true) {
    const { tags } = data.options;
    const maxLength = tagSupport.maxTags ?? Number.MAX_SAFE_INTEGER;
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
  websiteInstance,
  data,
}: ValidatorParams) {
  const { tagSupport } = websiteInstance.decoratedProps;
  if (tagSupport?.supportsTags === true) {
    const { tags } = data.options;
    const minLength = tagSupport.minTags ?? -1;
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
  websiteInstance,
  data,
}: ValidatorParams) {
  const { tagSupport } = websiteInstance.decoratedProps;
  if (tagSupport?.supportsTags === true) {
    const { tags } = data.options;
    const maxLength = tagSupport.maxTagLength ?? Number.MAX_SAFE_INTEGER;
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
