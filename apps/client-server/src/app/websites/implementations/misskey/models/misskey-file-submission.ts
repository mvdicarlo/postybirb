import {
  BooleanField,
  DescriptionField,
  SelectField,
  TagField,
  TextField,
  TitleField,
} from '@postybirb/form-builder';
import {
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class MisskeyFileSubmission extends BaseWebsiteOptions {
  @TitleField({
    expectedInDescription: true,
  })
  title = '';

  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
  })
  description: DescriptionValue;

  @TagField({
    spaceReplacer: '_',
    expectedInDescription: true,
  })
  tags: TagValue = DefaultTagValue();

  override processTag(tag: string) {
    return `${tag.replaceAll(/[^a-z0-9]/gi, '_')}`;
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
