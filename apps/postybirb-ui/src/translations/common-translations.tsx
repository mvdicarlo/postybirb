import { Trans } from '@lingui/react/macro';
import { SubmissionType } from '@postybirb/types';
import { PropsWithChildren } from 'react';

type WithNounProps = PropsWithChildren;

export class CommonTranslations {
  static File() {
    return <Trans>File</Trans>;
  }

  static Message() {
    return <Trans>Message</Trans>;
  }

  static NounSubmission(props: WithNounProps) {
    const { children } = props;
    if (children) {
      return <Trans>{children} Submission</Trans>;
    }
    return <Trans>Submission</Trans>;
  }

  static FileSubmission() {
    return (
      <CommonTranslations.NounSubmission>
        <CommonTranslations.File />
      </CommonTranslations.NounSubmission>
    );
  }

  static MessageSubmission() {
    return (
      <CommonTranslations.NounSubmission>
        <CommonTranslations.Message />
      </CommonTranslations.NounSubmission>
    );
  }

  static SubmissionType(props: {
    type: SubmissionType;
    withSubmission?: boolean;
  }) {
    const { type, withSubmission } = props;
    switch (type) {
      case SubmissionType.FILE:
        return withSubmission ? (
          <CommonTranslations.FileSubmission />
        ) : (
          <CommonTranslations.File />
        );
      case SubmissionType.MESSAGE:
        return withSubmission ? (
          <CommonTranslations.MessageSubmission />
        ) : (
          <CommonTranslations.Message />
        );
      default:
        return <CommonTranslations.Unknown />;
    }
  }

  static Unknown() {
    return <Trans>Unknown</Trans>;
  }

  static Name() {
    return <Trans>Name</Trans>;
  }

  static Edit() {
    return <Trans>Edit</Trans>;
  }

  static Hide() {
    return <Trans>Hide</Trans>;
  }

  static Save() {
    return <Trans>Save</Trans>;
  }

  static Shortcut() {
    return <Trans>Shortcut</Trans>;
  }

  static Delete() {
    return <Trans>Delete</Trans>;
  }

  static Clear() {
    return <Trans>Clear</Trans>;
  }

  static Cancel() {
    return <Trans>Cancel</Trans>;
  }

  static Close() {
    return <Trans>Close</Trans>;
  }

  static Update() {
    return <Trans>Update</Trans>;
  }

  static Website() {
    return <Trans>Website</Trans>;
  }

  static FailedToUpdate() {
    return <Trans>Failed to update</Trans>;
  }

  static CopiedToClipboard() {
    return <Trans>Copied to clipboard</Trans>;
  }

  static CopyToClipboard() {
    return <Trans>Copy to clipboard</Trans>;
  }

  static NounAdd(props: WithNounProps) {
    const { children } = props;
    if (children) {
      return <Trans>Add {children}</Trans>;
    }
    return <Trans>Add</Trans>;
  }

  static NounNew(props: WithNounProps) {
    const { children } = props;
    if (children) {
      return <Trans>New {children}</Trans>;
    }
    return <Trans>New</Trans>;
  }

  static NounUpdated(props: WithNounProps) {
    const { children } = props;
    if (children) {
      return <Trans>{children} updated</Trans>;
    }
    return <Trans>Updated</Trans>;
  }

  static NounDeleted(props: WithNounProps) {
    const { children } = props;
    if (children) {
      return <Trans>{children} deleted</Trans>;
    }
    return <Trans>Deleted</Trans>;
  }

  static NounCreated(props: WithNounProps) {
    const { children } = props;
    if (children) {
      return <Trans>{children} created</Trans>;
    }
    return <Trans>Created</Trans>;
  }

  static NoItemsFound() {
    return <Trans>No results found</Trans>;
  }

  static SortAscending() {
    return <Trans>Sort Ascending</Trans>;
  }

  static SortDescending() {
    return <Trans>Sort Descending</Trans>;
  }
}
