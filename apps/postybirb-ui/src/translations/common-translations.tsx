import { Trans } from '@lingui/react/macro';

type WithNounProps = { noun?: React.ReactNode };

export class CommonTranslations {
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
    const { noun } = props;
    if (noun) {
      return <Trans>Add {noun}</Trans>;
    }
    return <Trans>Add</Trans>;
  }

  static NounNew(props: WithNounProps) {
    const { noun } = props;
    if (noun) {
      return <Trans>New {noun}</Trans>;
    }
    return <Trans>New</Trans>;
  }

  static NounUpdated(props: WithNounProps) {
    const { noun } = props;
    if (noun) {
      return <Trans>{noun} updated</Trans>;
    }
    return <Trans>Updated</Trans>;
  }

  static NounDeleted(props: WithNounProps) {
    const { noun } = props;
    if (noun) {
      return <Trans>{noun} deleted</Trans>;
    }
    return <Trans>Deleted</Trans>;
  }

  static NounCreated(props: WithNounProps) {
    const { noun } = props;
    if (noun) {
      return <Trans>{noun} created</Trans>;
    }
    return <Trans>Created</Trans>;
  }

  static NoItemsFound() {
    return <Trans>No items found</Trans>;
  }

  static SortAscending() {
    return <Trans>Sort Ascending</Trans>;
  }

  static SortDescending() {
    return <Trans>Sort Descending</Trans>;
  }
}
