import { Trans } from '@lingui/macro';
import { ValidationMessage, ValidationMessages } from '@postybirb/types';
import { filesize } from 'filesize';

type TranslationsMap = {
  [K in keyof ValidationMessages]: (
    props: Omit<ValidationMessage<object, K>, 'field' | 'id'>,
  ) => JSX.Element;
};
export const TranslationMessages: Partial<TranslationsMap> = {
  'validation.failed': (props) => {
    const message = props.values?.message;
    return <Trans>Failed to validate submission: {message}</Trans>;
  },

  'validation.description.max-length': (props) => {
    const maxLength = props.values?.maxLength ?? 0;
    return (
      <Trans>Description is greater than {maxLength} characters long</Trans>
    );
  },

  'validation.description.min-length': (props) => {
    const minLength = props.values?.minLength ?? 0;
    return <Trans>Description is less than {minLength} characters long</Trans>;
  },

  'validation.file.file-batch-size': (props) => {
    const { maxBatchSize, expectedBatchesToCreate } = props.values;
    return (
      <Trans>
        Submission will be split into {expectedBatchesToCreate} different
        submissions with {maxBatchSize} files each.
      </Trans>
    );
  },

  'validation.file.invalid-mime-type': (props) => {
    const { mimeType, acceptedMimeTypes } = props.values;
    return (
      <>
        <Trans>Unsupported file type {mimeType}</Trans> (
        {acceptedMimeTypes.join(', ')})
      </>
    );
  },

  'validation.file.file-size': (props) => {
    const { maxFileSize, fileSize, fileName } = props.values;
    const fileSizeString = filesize(fileSize);
    const maxFileSizeString = filesize(maxFileSize);
    return (
      <Trans>
        {fileName} ({fileSizeString}) is too large (max {maxFileSizeString}) and
        an attempt will be made to reduce size when posting
      </Trans>
    );
  },

  'validation.file.image-resize': (props) => {
    const { fileName } = props.values;
    return (
      <Trans>{fileName} will be modified to support website requirements</Trans>
    );
  },

  'validation.tags.max-tags': (props) => {
    //
    // Tag limit reached (7/5)
    // Tag limit reached (7 / 5)
    // with space its more readable
    //
    const { maxLength, currentLength } = props.values;
    return (
      <Trans>
        Tag limit reached ({currentLength} / {maxLength})
      </Trans>
    );
  },

  'validation.tags.min-tags': (props) => {
    const { minLength, currentLength } = props.values;
    return (
      <Trans>
        Requires at least {minLength} tags{' '}
        <span>
          ({currentLength}/{minLength})
        </span>
      </Trans>
    );
  },

  'validation.tags.max-tag-length': (props) => {
    const { tags, maxLength } = props.values;
    return (
      <>
        <Trans>Tags longer than {maxLength} characters will be skipped</Trans>:{' '}
        <span>{tags.join(', ')}</span>
      </>
    );
  },

  'validation.title.max-length': (props) => {
    const { maxLength, currentLength, willTruncate } = props.values;
    let translatedMsg;
    if (willTruncate) {
      translatedMsg = <Trans>Title is too long and will be truncated</Trans>;
    } else {
      translatedMsg = <Trans>Title is too long</Trans>;
    }

    return (
      <>
        {translatedMsg} ({currentLength} / {maxLength})
      </>
    );
  },

  'validation.title.min-length': (props) => {
    const { minLength, currentLength } = props.values;
    return (
      <>
        <Trans>Title is too short</Trans> ({currentLength} / {minLength})
      </>
    );
  },
};

export function ValidationTranslation(
  props: Omit<ValidationMessage, 'field'>,
): JSX.Element {
  const { id } = props;
  const translation = TranslationMessages[id];
  if (translation) {
    return translation(
      // @ts-expect-error Typescript does not know union type
      props,
    );
  }

  return <Trans>Translation {id} not found</Trans>;
}
