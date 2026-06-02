import { ValidatorParams } from './validator.type';

export async function validateTitleMaxLength({
  data,
  mergedWebsiteOptions,
  validator,
}: ValidatorParams) {
  const { hidden, maxLength } = mergedWebsiteOptions.getFormFieldFor('title');
  if (hidden) return;
  if (typeof maxLength === 'undefined') return;

  const { title } = data.options;

  if (title.length > maxLength) {
    validator.warning(
      'validation.title.max-length',
      { currentLength: title.length, maxLength },
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
