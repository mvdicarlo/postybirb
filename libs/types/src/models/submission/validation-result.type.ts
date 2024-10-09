import { ImageResizeProps } from '../website/image-resize-props';
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
  'validation.file.invalid-mime-type': {
    mimeType: string;
    acceptedMimeTypes: string[];
  };

  // An error message for when the validation fails
  'validation.failed': {
    /**
     * The error message
     */
    message: string;
  };

  'validation.file.file-batch-size': {
    maxBatchSize: number;
    expectedBatchesToCreate: number;
  };

  'validation.file.file-size': {
    maxFileSize: number;
    fileSize: number;
    fileName: string;
  };

  'validation.file.image-resize': {
    fileName: string;
    resizeProps: ImageResizeProps;
  };

  'validation.description.max-length': {
    currentLength: number;
    maxLength: number;
  };

  'validation.description.min-length': {
    currentLength: number;
    minLength: number;
  };
}
