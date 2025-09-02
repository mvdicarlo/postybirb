import {
  BooleanField,
  DescriptionField,
  SelectField,
  TagField,
} from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { PicartoCategories } from './picarto-categories';
import { PicartoSoftware } from './picarto-software';

export class PicartoFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
  })
  description: DescriptionValue;

  @TagField({
    maxTags: 30,
    maxTagLength: 30,
    spaceReplacer: '_',
  })
  tags: TagValue;

  @SelectField({
    label: 'visibility',
    section: 'website',
    span: 6,
    options: [
      { value: 'PUBLIC', label: 'Public' },
      { value: 'PRIVATE', label: 'Private' },
      { value: 'FOLLOWER_SUBSCRIBER', label: 'Followers only' },
      { value: 'SUBSCRIBER', label: 'Subscribers only' },
    ],
  })
  visibility: 'PUBLIC' | 'PRIVATE' | 'FOLLOWER_SUBSCRIBER' | 'SUBSCRIBER' =
    'PUBLIC';

  @SelectField({
    label: 'folder',
    section: 'website',
    span: 6,
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
    options: [],
  })
  folder: string;

  @SelectField({
    label: 'commentPermissions',
    section: 'website',
    span: 6,
    options: [
      { value: 'EVERYONE', label: 'Everyone' },
      { value: 'FOLLOWERS', label: 'Followers' },
      { value: 'SUBSCRIBERS', label: 'Subscribers' },
      { value: 'DISABLED', label: 'Disabled' },
    ],
  })
  comments: 'EVERYONE' | 'FOLLOWERS' | 'SUBSCRIBERS' | 'DISABLED' = 'EVERYONE';

  @SelectField({
    label: 'category',
    section: 'website',
    span: 6,
    options: PicartoCategories,
  })
  category = 'Creative';

  @SelectField({
    label: 'software',
    section: 'website',
    span: 12,
    allowMultiple: true,
    options: PicartoSoftware,
  })
  softwares: string[] = [];

  @BooleanField({
    label: 'allowFreeDownload',
    section: 'website',
    span: 6,
  })
  downloadSource = true;
}
