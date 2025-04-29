import { Trans } from '@lingui/macro';
import { Text } from '@mantine/core';
import {
  FileType,
  ValidationMessage,
  ValidationMessages,
} from '@postybirb/types';
import { filesize } from 'filesize';

type TranslationsMap = {
  [K in keyof ValidationMessages]: (
    props: ValidationMessage<object, K>['values'],
  ) => JSX.Element;
};
export const TranslationMessages: TranslationsMap = {
  'validation.failed': (props) => {
    const message = props?.message;
    return <Trans>Failed to validate submission: {message}</Trans>;
  },

  'validation.description.max-length': (props) => {
    const maxLength = props?.maxLength ?? 0;
    return (
      <Trans>Description is greater than {maxLength} characters long</Trans>
    );
  },

  'validation.description.min-length': (props) => {
    const minLength = props?.minLength ?? 0;
    return <Trans>Description is less than {minLength} characters long</Trans>;
  },

  'validation.file.file-batch-size': (props) => {
    const { maxBatchSize, expectedBatchesToCreate } = props;
    return (
      <Trans>
        Submission will be split into {expectedBatchesToCreate} different
        submissions with {maxBatchSize} files each.
      </Trans>
    );
  },

  'validation.file.text-file-no-fallback': (props) => {
    const { fileExtension } = props;
    return (
      <Trans>
        Unsupported file type {fileExtension}. Please provide fallback text.
      </Trans>
    );
  },

  'validation.file.invalid-mime-type': (props) => {
    const { mimeType, acceptedMimeTypes } = props;
    return (
      <>
        <Trans>Unsupported file type {mimeType}</Trans> (
        {acceptedMimeTypes.join(', ')})
      </>
    );
  },

  'validation.file.all-ignored': () => (
    <Trans>All files are marked ignored.</Trans>
  ),

  'validation.file.unsupported-file-type': (props) => {
    const { fileType } = props;
    let fileTypeString;
    switch (fileType) {
      case FileType.IMAGE:
        fileTypeString = <Trans>Image</Trans>;
        break;
      case FileType.VIDEO:
        fileTypeString = <Trans>Video</Trans>;
        break;
      case FileType.TEXT:
        fileTypeString = <Trans>Text</Trans>;
        break;
      case FileType.AUDIO:
        fileTypeString = <Trans>Audio</Trans>;
        break;
      default:
        fileTypeString = <Trans>Unknown</Trans>;
        break;
    }
    return <Trans>Unsupported submission type: {fileTypeString}</Trans>;
  },

  'validation.file.file-size': (props) => {
    const { maxFileSize, fileSize } = props;
    const fileSizeString = filesize(fileSize);
    const maxFileSizeString = filesize(maxFileSize);
    return (
      <Trans>
        ({fileSizeString}) is too large (max {maxFileSizeString}) and an attempt
        will be made to reduce size when posting
      </Trans>
    );
  },

  'validation.file.image-resize': () => (
    <Trans>File will be modified to support website requirements</Trans>
  ),

  'validation.tags.max-tags': (props) => {
    //
    // Tag limit reached (7/5)
    // Tag limit reached (7 / 5)
    // with space its more readable
    //
    const { maxLength, currentLength } = props;
    return (
      <Trans>
        Tag limit reached ({currentLength} / {maxLength})
      </Trans>
    );
  },

  'validation.tags.min-tags': (props) => {
    const { minLength, currentLength } = props;
    return (
      <>
        <Trans>Requires at least {minLength} tags</Trans>
        <Text inherit span>
          {' '}
          ({currentLength} / {minLength})
        </Text>
      </>
    );
  },

  'validation.tags.max-tag-length': (props) => {
    const { tags, maxLength } = props;
    return (
      <>
        <Trans>Tags longer than {maxLength} characters will be skipped</Trans>:{' '}
        <span>{tags.join(', ')}</span>
      </>
    );
  },

  'validation.title.max-length': (props) => {
    const { maxLength, currentLength } = props;
    const translatedMsg = (
      <Trans>Title is too long and will be truncated</Trans>
    );

    return (
      <>
        {translatedMsg} ({currentLength} / {maxLength})
      </>
    );
  },

  'validation.title.min-length': (props) => {
    const { minLength, currentLength } = props;
    return (
      <>
        <Trans>Title is too short</Trans> ({currentLength} / {minLength})
      </>
    );
  },
};

export function ValidationTranslation({
  values,
  id,
}: Pick<ValidationMessage, 'id' | 'values'>): JSX.Element {
  const translation = TranslationMessages[id];
  if (translation) {
    return translation(
      // @ts-expect-error Typescript does not know union type
      values,
    );
  }

  return <Trans>Translation {id} not found</Trans>;
}
