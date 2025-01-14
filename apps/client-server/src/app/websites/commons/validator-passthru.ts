import { IWebsiteFormFields, SimpleValidationResult } from '@postybirb/types';

export async function validatorPassthru(): Promise<
  SimpleValidationResult<IWebsiteFormFields>
> {
  return {};
}
