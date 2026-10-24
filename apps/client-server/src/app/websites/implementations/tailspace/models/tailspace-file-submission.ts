import {
  BooleanField,
  DescriptionField,
  SelectField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DescriptionType,
  DescriptionValue,
  TagValue,
  TailspaceAccountData,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class TailspaceFileSubmission extends BaseWebsiteOptions {
  // Required for posts only; comic pages don't use it (onValidateFileSubmission).
  @TitleField({ maxLength: 200, required: false })
  declare title: string;

  @DescriptionField({
    required: false,
    maxDescriptionLength: 5000,
    descriptionType: DescriptionType.MARKDOWN,
  })
  declare description: DescriptionValue;

  @TagField({ maxTags: 20, maxTagLength: 40, spaceReplacer: ' ' })
  declare tags: TagValue;

  @SelectField<TailspaceAccountData>({
    label: { untranslated: 'Add as pages to comic' },
    options: [],
    derive: [{ key: 'comics', populate: 'options' }],
    section: 'website',
    span: 6,
  })
  comic = '';

  @BooleanField({
    label: { untranslated: 'Allow comments' },
    defaultValue: true,
    section: 'website',
    span: 6,
  })
  allowComments: boolean;
}
