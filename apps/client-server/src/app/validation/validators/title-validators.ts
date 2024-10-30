import { ValidationMessage } from '@postybirb/types';
import { ValidatorParams } from './validator.type';

export async function validateTitleMaxLength({
  result,
  websiteInstance,
  data,
}: ValidatorParams) {
  const { titleSupport } = websiteInstance.decoratedProps;
  if (titleSupport?.supportsTitle === true) {
    const { title } = data.options;
    const maxLength = titleSupport.maxTitleLength ?? Number.MAX_SAFE_INTEGER;
    if (title.length > maxLength) {
      const v: ValidationMessage = {
        id: 'validation.title.max-length',
        field: 'title',
        values: {
          currentLength: title.length,
          maxLength,
          willTruncate: titleSupport.truncateTitle,
        },
      };
      if (titleSupport.truncateTitle) {
        result.warnings.push(v);
      } else {
        result.errors.push(v);
      }
    }
  }
}

export async function validateTitleMinLength({
  result,
  websiteInstance,
  data,
}: ValidatorParams) {
  const { titleSupport } = websiteInstance.decoratedProps;
  if (titleSupport?.supportsTitle === true) {
    const { title } = data.options;
    const minLength = titleSupport.minTitleLength ?? -1;
    if (title.length < minLength) {
      result.errors.push({
        id: 'validation.title.min-length',
        field: 'title',
        values: {
          currentLength: title.length,
          minLength,
        },
      });
    }
  }
}
