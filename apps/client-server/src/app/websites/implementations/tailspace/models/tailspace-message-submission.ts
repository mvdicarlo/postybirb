import {
  BooleanField,
  DescriptionField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class TailspaceMessageSubmission extends BaseWebsiteOptions {
  @TitleField({ maxLength: 200 })
  declare title: string;

  @DescriptionField({
    required: true,
    maxDescriptionLength: 5000,
    descriptionType: DescriptionType.MARKDOWN,
  })
  declare description: DescriptionValue;

  @TagField({ maxTags: 20, maxTagLength: 40, spaceReplacer: ' ' })
  declare tags: TagValue;

  @BooleanField({
    label: { untranslated: 'Allow comments' },
    defaultValue: true,
    section: 'website',
    span: 12,
  })
  allowComments: boolean;
}
