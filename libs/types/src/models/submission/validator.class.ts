import {
  SimpleValidationResult,
  ValidationMessages,
} from './validation-result.type';
import { IWebsiteFormFields } from './website-form-fields.interface';

type KeysToOmit =
  | 'mergeDefaults'
  | 'getFormFieldFor'
  | 'getFormFields'
  | 'getProcessedTags';

export class SubmissionValidator<Fields extends IWebsiteFormFields = never> {
  protected readonly warnings: SimpleValidationResult<Fields>['warnings'] = [];

  protected readonly errors: SimpleValidationResult<Fields>['errors'] = [];

  error<T extends keyof ValidationMessages>(
    id: T,
    values: ValidationMessages[T],
    field?: keyof Omit<Fields, KeysToOmit>,
  ) {
    this.errors.push({ id, values, field });
  }

  warning<T extends keyof ValidationMessages>(
    id: T,
    values: ValidationMessages[T],
    field?: keyof Omit<Fields, KeysToOmit>,
  ) {
    this.warnings.push({ id, values, field });
  }

  get result() {
    return { errros: this.errors, warnings: this.warnings };
  }
}
