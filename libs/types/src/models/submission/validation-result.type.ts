import { IWebsiteFormFields } from './website-form-fields.interface';

export type ValidationResult<T extends IWebsiteFormFields = never> = {
  /**
   * Non-blocking issues with the validated submission.
   */
  warnings?: ValidationMessage<T>[];

  /**
   * Blocking issues with the validated submission.
   */
  errors?: ValidationMessage<T>[];
};

export type ValidationMessage<
  T extends object = never,
  Id extends keyof ValidationMessages = keyof ValidationMessages
> = {
  /**
   * Localization message id.
   */
  id: Id;

  /**
   * Associates the message to a input field.
   */
  field?: keyof T;

  /**
   * Values to fill in the message.
   */
  values: ValidationMessages[Id];
};

/**
 * Map containing validation id as key and values as value
 */
export interface ValidationMessages {
  'validation.description.max-length': {
    /**
     * Max allowed description length
     */
    maxLength: number;
  };
}
