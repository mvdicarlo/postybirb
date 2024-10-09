import { DescriptionType } from '@postybirb/types';
import { ValidatorParams } from './validator.type';

export async function validateDescriptionMaxLength({
  result,
  websiteInstance,
  data,
}: ValidatorParams) {
  const { descriptionSupport } = websiteInstance.decoratedProps;
  if (
    websiteInstance.decoratedProps.descriptionSupport === undefined ||
    websiteInstance.decoratedProps.descriptionSupport
      .supportsDescriptionType === DescriptionType.NONE
  ) {
    return;
  }

  const { description } = data.options;
  const maxLength =
    descriptionSupport.maxDescriptionLength ?? Number.MAX_SAFE_INTEGER;
  if (description.length > maxLength) {
    result.errors.push({
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
  websiteInstance,
  data,
}: ValidatorParams) {
  const { descriptionSupport } = websiteInstance.decoratedProps;
  if (
    websiteInstance.decoratedProps.descriptionSupport === undefined ||
    websiteInstance.decoratedProps.descriptionSupport
      .supportsDescriptionType === DescriptionType.NONE
  ) {
    return;
  }

  const { description } = data.options;
  const minLength = descriptionSupport.minDescriptionLength ?? -1;
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
