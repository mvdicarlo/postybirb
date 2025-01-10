import { ValidationMessage } from '@postybirb/types';
import { ValidatorParams } from './validator.type';

export async function validateTitleMaxLength({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const { hidden, maxLength } = mergedWebsiteOptions.getFormFieldFor('title');
  if (hidden !== true) {
    const { title } = data.options;
    const maxTitleLength = maxLength ?? Number.MAX_SAFE_INTEGER;
    if (title.length > maxLength) {
      const v: ValidationMessage = {
        id: 'validation.title.max-length',
        field: 'title',
        values: {
          currentLength: title.length,
          maxLength: maxTitleLength,
        },
      };
      result.warnings.push(v);
    }
  }
}

export async function validateTitleMinLength({
  result,
  data,
  mergedWebsiteOptions,
}: ValidatorParams) {
  const { hidden, minLength } = mergedWebsiteOptions.getFormFieldFor('title');
  if (hidden !== true) {
    const { title } = data.options;
    const minTitleLength = minLength ?? -1;
    if (title.length < minTitleLength) {
      result.errors.push({
        id: 'validation.title.min-length',
        field: 'title',
        values: {
          currentLength: title.length,
          minLength: minTitleLength,
        },
      });
    }
  }
}
