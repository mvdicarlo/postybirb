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

export class MisskeyFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    expectsInlineTags: true,
    expectsInlineTitle: true,
  })
  description: DescriptionValue;

  @TagField({
    spaceReplacer: '_',
  })
  tags: TagValue = DefaultTagValue();

  override processTag(tag: string) {
    return `${tag.replaceAll(/\s+/g, '_')}`;
  }

  @SelectField({
    label: 'visibility',
    options: [
      { value: 'public', label: 'Public' },
      { value: 'home', label: 'Home' },
      { value: 'followers', label: 'Followers' },
      { value: 'specified', label: 'Direct' },
    ],
    span: 12,
  })
  visibility: 'public' | 'home' | 'followers' | 'specified' = 'public';

  @TextField({
    label: 'spoiler',
    span: 12,
  })
  cw?: string;

  @BooleanField({
    label: { untranslated: 'Local only' },
    span: 6,
  })
  localOnly = false;

  @BooleanField({
    label: 'sensitiveContent',
    span: 6,
  })
  sensitive = false;
}
