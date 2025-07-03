import { IEntityDto } from '../../dtos';
import { FileType } from '../../enums';
import { IAccount } from '../account/account.interface';
import { EntityId } from '../database/entity.interface';
import { ImageResizeProps } from '../website/image-resize-props';
import { IWebsiteFormFields } from './website-form-fields.interface';

export type SimpleValidationResult<T extends IWebsiteFormFields = never> = Omit<
  ValidationResult<T>,
  'id' | 'account'
>;

export type ValidationResult<T extends IWebsiteFormFields = never> = {
  /**
   * Id that associates with the website options the validation was performed on.
   */
  id: EntityId;

  /**
   * The account associated with the website options.
   * More for readability and to avoid having to look up the account from the website options.
   */
  account: IEntityDto<IAccount>;

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
  Id extends keyof ValidationMessages = keyof ValidationMessages,
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
  // An error message for when the validation fails
  'validation.failed': {
    /**
     * The error message
     */
    message: string;
  };

  'validation.file.invalid-mime-type': {
    mimeType: string;
    acceptedMimeTypes: string[];
    fileId: string;
  };

  'validation.file.all-ignored': object;

  'validation.file.unsupported-file-type': {
    fileName: string;
    fileType: FileType;
    fileId: string;
  };

  'validation.file.file-batch-size': {
    maxBatchSize: number;
    expectedBatchesToCreate: number;
  };

  'validation.file.text-file-no-fallback': {
    fileName: string;
    fileExtension: string;
    fileId: string;
  };

  'validation.file.file-size': {
    maxFileSize: number;
    fileSize: number;
    fileName: string;
    fileId: string;
  };

  'validation.file.image-resize': {
    fileName: string;
    resizeProps: ImageResizeProps;
    fileId: string;
  };

  'validation.description.max-length': {
    currentLength: number;
    maxLength: number;
  };

  'validation.description.min-length': {
    currentLength: number;
    minLength: number;
  };

  'validation.tags.max-tags': {
    currentLength: number;
    maxLength: number;
  };

  'validation.tags.min-tags': {
    currentLength: number;
    minLength: number;
  };

  'validation.tags.max-tag-length': {
    tags: string[];
    maxLength: number;
  };

  'validation.title.max-length': {
    currentLength: number;
    maxLength: number;
  };

  'validation.title.min-length': {
    currentLength: number;
    minLength: number;
  };

  'validation.select-field.min-selected': {
    minSelected: number;
    currentSelected: number;
  };

  'validation.select-field.invalid-option': {
    invalidOptions: string[];
  };

  'validation.field.required': object;

  // ----------- Website specific validation messages --------------
  'validation.file.itaku.must-share-feed': object;

  'validation.file.bluesky.unsupported-combination-of-files': object;

  'validation.file.bluesky.gif-conversion': object;

  'validation.file.bluesky.invalid-reply-url': object;

  'validation.file.bluesky.rating-matches-default': object;

  'validation.file.e621.tags.network-error': object;

  'validation.file.e621.tags.recommended': {
    generalTags: number;
  };

  'validation.file.e621.tags.missing': {
    tag: string;
  };

  'validation.file.e621.tags.missing-create': {
    tag: string;
  };

  'validation.file.e621.tags.invalid': {
    tag: string;
  };

  'validation.file.e621.tags.low-use': {
    tag: string;
    postCount: number;
  };

  'validation.file.e621.user-feedback.network-error': object;

  'validation.file.e621.user-feedback.recent': {
    negativeOrNeutral: string;
    feedback: string;
    username: string;
  };
}
