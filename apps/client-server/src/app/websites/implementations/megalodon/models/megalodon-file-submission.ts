import {
    BooleanField,
    DescriptionField,
    SelectField,
    TagField,
    TextField,
} from '@postybirb/form-builder';
import {
    DefaultTagValue,
    DescriptionType,
    DescriptionValue,
    TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class MegalodonFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
  })
  description: DescriptionValue;

  @TagField({
    spaceReplacer: '_',
  })
  tags: TagValue = DefaultTagValue();

  override processTag(tag: string) {
    return `#${tag.replaceAll(/[^a-z0-9]/gi, '_')}`;
  }

  @SelectField({
    label: 'visibility',
    options: [
      { value: 'public', label: 'Public' },
      { value: 'unlisted', label: 'Unlisted' },
      { value: 'private', label: 'Followers only' },
      { value: 'direct', label: 'Direct' },
    ],
    span: 12,
  })
  visibility: 'public' | 'unlisted' | 'private' | 'direct' = 'public';

  @TextField({
    label: 'spoiler',
    span: 12,
  })
  spoilerText?: string;

  @TextField({
    label: 'language',
    span: 12,
  })
  language?: string;

  @BooleanField({
    label: 'sensitiveContent',
    span: 3,
  })
  sensitive = false;
}
