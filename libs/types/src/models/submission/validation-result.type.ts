import { IWebsiteFormFields } from './website-form-fields.interface';

export type ValidationResult<T extends IWebsiteFormFields = never> = {
  /**
   * Non-blocking issues with the validated submission.
   *
   * @type {ValidationMessage[]}
   */
  warnings?: ValidationMessage<T>[];

  /**
   * Blocking issues with the validated submission.
   *
   * @type {ValidationMessage[]}
   */
  errors?: ValidationMessage<T>[];
};

export type ValidationMessage<T extends object> = {
  /**
   * Intl message id.
   * @type {string}
   */
  id: string;

  /**
   * Associates the message to a input field.
   *
   * @type {(keyof T | undefined)}
   */
  field?: keyof T;

  /**
   * Potential values to fill in the message.
   *
   * @type {(Record<string, string | number>)}
   */
  values?: Record<string, string | number>;
};
