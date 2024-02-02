export type ValidationResult<T extends object = object> = {
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
  T extends object,
  ID extends keyof ValidationMessages = keyof ValidationMessages
> = {
  /**
   * Localization message id.
   */
  id: ID;

  /**
   * Associates the message to a input field.
   */
  field?: keyof T;

  /**
   * Values to fill in the message.
   */
  values: ValidationMessages[ID];
};

/**
 * Map containing validation id as key and values as value
 */
export type ValidationMessages = {
  'validation.description.max-length': {
    /**
     * Max allowed description length
     */
    maxLength: number;
  };
};
