import { ValidatorParams } from './validator.type';

export async function validateTitleMaxLength({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const { hidden, maxLength } = mergedWebsiteOptions.getFormFieldFor('title');
  if (hidden) return;

  const { title } = data.options;
  const maxTitleLength = maxLength ?? Number.MAX_SAFE_INTEGER;

  if (title.length > maxLength) {
    validator.warning(
      'validation.title.max-length',
      { currentLength: title.length, maxLength: maxTitleLength },
      'title',
    );
  }
}

export async function validateTitleMinLength({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const { hidden, minLength } = mergedWebsiteOptions.getFormFieldFor('title');
  if (hidden) return;

  const { title } = data.options;
  const minTitleLength = minLength ?? -1;

  if (title.length < minTitleLength) {
    validator.error(
      'validation.title.min-length',
      { currentLength: title.length, minLength: minTitleLength },
      'title',
    );
  }
}

export async function validateTitlePresence({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const { hidden, expectedInDescription } =
    mergedWebsiteOptions.getFormFieldFor('title');
  const { title, description } = data.options;

  if (hidden || !title || !description) return;

  const hasTitleText = description.includes(title);

  if (expectedInDescription) {
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
