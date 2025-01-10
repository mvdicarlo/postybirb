import { DescriptionType } from '@postybirb/types';
import { ValidatorParams } from './validator.type';

export async function validateDescriptionMaxLength({
  result,
  data,
  mergedWebsiteOptions,
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
    result.warnings.push({
      id: 'validation.description.max-length',
      field: 'description',
      values: {
        currentLength: description.length,
        maxLength,
      },
    });
  }
}

export async function validateDescriptionMinLength({
  result,
  data,
  mergedWebsiteOptions,
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
    result.errors.push({
      id: 'validation.description.min-length',
      field: 'description',
      values: {
        currentLength: description.length,
        minLength,
      },
    });
  }
}
