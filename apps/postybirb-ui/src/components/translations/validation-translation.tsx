import { Plural, Trans } from "@lingui/react/macro";
import { Text } from '@mantine/core';
import {
  FileType,
  SubmissionRating,
  ValidationMessage,
  ValidationMessages,
} from '@postybirb/types';
import { filesize } from 'filesize';
import { ExternalLink } from '../external-link/external-link';

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
    const currentLength = props?.currentLength ?? 0;
    return (
      <Trans>
        Description length is greater then maximum ({currentLength} /{' '}
        {maxLength})
      </Trans>
    );
  },

  'validation.description.min-length': (props) => {
    const minLength = props?.minLength ?? 0;
    const currentLength = props?.currentLength ?? 0;
    return (
      <Trans>
        Description length is lower then minimum ({currentLength} / {minLength})
      </Trans>
    );
  },

  'validation.file.file-batch-size': (props) => {
    const { maxBatchSize, expectedBatchesToCreate } = props;
    return (
      <Trans>
        Submission will be split into {expectedBatchesToCreate} different
        submissions with {maxBatchSize}{' '}
        <Plural value={maxBatchSize} one="file each" other="files each" />.
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
        <Trans>
          Requires at least {minLength}{' '}
          <Plural value={minLength} one="tag" other="tags" />
        </Trans>
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

  'validation.file.itaku.must-share-feed': () => (
    <Trans>Share on Feed is required to support posting multiple files.</Trans>
  ),

  'validation.select-field.min-selected': (props) => {
    const { currentSelected, minSelected } = props;

    return (
      <Trans>
        Requires at least {minSelected}{' '}
        <Plural
          value={minSelected}
          one="option selected"
          other="options selected"
        />{' '}
        ({currentSelected} / {minSelected})
      </Trans>
    );
  },

  'validation.select-field.invalid-option': (props) => {
    const { invalidOptions } = props;
    return (
      <span>
        <Trans>Unknown choice</Trans>: {invalidOptions.join(', ')}
      </span>
    );
  },

  'validation.field.required': () => <Trans>Required</Trans>,

  'validation.datetime.invalid-format': (props) => {
    const { value } = props;
    return (
      <Trans>Invalid date format: {value}. Expected ISO date string.</Trans>
    );
  },

  'validation.datetime.min': (props) => {
    const { currentDate, minDate } = props;
    return (
      <Trans>
        Date {currentDate} is before minimum allowed date {minDate}
      </Trans>
    );
  },

  'validation.datetime.max': (props) => {
    const { currentDate, maxDate } = props;
    return (
      <Trans>
        Date {currentDate} is after maximum allowed date {maxDate}
      </Trans>
    );
  },

  'validation.datetime.range': (props) => {
    const { currentDate, minDate, maxDate } = props;
    return (
      <Trans>
        Date {currentDate} is outside allowed range ({minDate} - {maxDate})
      </Trans>
    );
  },

  'validation.file.bluesky.unsupported-combination-of-files': () => (
    <Trans>
      Supports either a set of images, a single video, or a single GIF.
    </Trans>
  ),
  'validation.file.bluesky.gif-conversion': () => (
    <Trans>Bluesky automatically converts GIFs to videos.</Trans>
  ),

  'validation.file.bluesky.invalid-reply-url': () => (
    <Trans>Invalid post URL to reply to.</Trans>
  ),

  'validation.file.bluesky.rating-matches-default': () => (
    <Trans>
      Make sure that the default rating matches Bluesky Label Rating.
    </Trans>
  ),

  'validation.file.e621.tags.network-error': () => (
    <Trans>Failed to validate tags. Please check them manually</Trans>
  ),

  'validation.file.e621.tags.recommended': ({ generalTags }) => (
    <Trans>
      It is recommended to add at least 10 general tags{' '}
      <strong>( {generalTags} / 10 )</strong>. See{' '}
      <ExternalLink href="https://e621.net/help/tagging_checklist">
        tagging checklist
      </ExternalLink>
    </Trans>
  ),

  'validation.file.e621.user-feedback.network-error': () => (
    <Trans>
      Failed to get user warnings. You can check your account manually
    </Trans>
  ),

  'validation.file.e621.user-feedback.recent': ({
    feedback,
    negativeOrNeutral,
    username,
  }) => (
    <Trans>
      You have recent {negativeOrNeutral} feedback: {feedback}, you can view it
      <ExternalLink
        href={`https://e621.net/user_feedbacks?search[user_name]=${username}`}
      >
        here
      </ExternalLink>
    </Trans>
  ),

  'validation.file.e621.tags.missing': ({ tag }) => (
    <Trans>
      Tag{' '}
      <ExternalLink
        href={`https://e621.net/wiki_pages/show_or_new?title=${tag}`}
      >
        {tag}
      </ExternalLink>{' '}
      does not exist yet or is invalid.
    </Trans>
  ),

  'validation.file.e621.tags.missing-create': ({ tag }) => (
    <Trans>
      Tag{' '}
      <ExternalLink
        href={`https://e621.net/wiki_pages/show_or_new?title=${tag}`}
      >
        {tag}
      </ExternalLink>{' '}
      does not exist yet or is invalid. If you want to create a new tag, make a
      post with it, then go{' '}
      <ExternalLink href={`https://e621.net/tags?search[name]=${tag}`}>
        here
      </ExternalLink>
      , press edit and select tag category
    </Trans>
  ),

  'validation.file.e621.tags.invalid': ({ tag }) => (
    <Trans>
      Tag{' '}
      <ExternalLink
        href={`https://e621.net/wiki_pages/show_or_new?title=${tag}`}
      >
        {tag}
      </ExternalLink>{' '}
      is invalid.
    </Trans>
  ),

  'validation.file.e621.tags.low-use': ({ tag, postCount }) => (
    <Trans>
      Tag {tag} has {postCount} post(s). Tag may be invalid or low use
    </Trans>
  ),

  'validation.folder.missing-or-invalid': () => (
    <Trans>Selected option is invalid or missing</Trans>
  ),

  'validation.rating.unsupported-rating': (props: {
    rating: string;
  }): JSX.Element => {
    const { rating } = props;
    let ratingLabel: JSX.Element;
    switch (rating) {
      case SubmissionRating.GENERAL:
        ratingLabel = <Trans>General</Trans>;
        break;
      case SubmissionRating.MATURE:
        ratingLabel = <Trans>Mature</Trans>;
        break;
      case SubmissionRating.ADULT:
        ratingLabel = <Trans>Adult</Trans>;
        break;
      case SubmissionRating.EXTREME:
        ratingLabel = <Trans>Extreme</Trans>;
        break;
      default:
        ratingLabel = <span>{rating}</span>;
        break;
    }
    return <Trans>Unsupported rating: {ratingLabel}</Trans>;
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
