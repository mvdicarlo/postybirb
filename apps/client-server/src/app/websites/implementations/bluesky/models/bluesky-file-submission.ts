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

export enum BlueskyWhoCanReply {
  Mention = 'mention',
  Following = 'following',
  Followers = 'followers',
}

export class BlueskyFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.CUSTOM,
    maxDescriptionLength: Infinity, // Custom length calculation is handled by validation logic
    expectsInlineTags: true,
    expectsInlineTitle: true,
  })
  declare description: DescriptionValue;

  @TagField({
    spaceReplacer: '_',
  })
  tags: TagValue = DefaultTagValue();

  override processTag(tag: string) {
    return `${tag.replaceAll(/\s+/g, '_')}`;
  }

  // Note: in v3 it was label_rating
  @SelectField({
    label: 'rating',
    options: [
      { value: '', label: 'Suitable for all ages' },
      { value: 'sexual', label: 'Adult: Suggestive' },
      { value: 'nudity', label: 'Adult: Nudity' },
      { value: 'porn', label: 'Adult: Porn' },
    ],
    section: 'website',
    span: 6,
  })
  labelRating: '' | 'sexual' | 'nudity' | 'porn';

  /**
   // Note: in v3 it was threadgate
   * @deprecated
   */
  @SelectField({
    hidden: true,
    label: 'whoCanReply',
    section: 'website',
    span: 6,
    options: [
      { value: '', label: 'Everybody' },
      { value: 'nobody', label: 'Nobody' },
      { value: 'mention', label: 'Mentioned Users' },
      { value: 'following', label: 'Followed Users' },
      { value: 'mention,following', label: 'Mentioned & Followed Users' },
    ],
  })
  whoCanReply?: '' | 'nobody' | 'mention' | 'following' | 'mention,following';

  @TextField({ label: 'replyToUrl', section: 'website', span: 6 })
  replyToUrl?: string;

  @TextField({ label: 'quotePostUrl', section: 'website', span: 6 })
  quotePostUrl?: string;

  @SelectField<BlueskyFileSubmission>({
    label: 'whoCanReply',
    section: 'website',
    span: 6,
    options: [
      { value: '', label: 'Everybody' },
      { value: 'nobody', label: 'Nobody' },
      { value: 'configurable', label: 'Configure' },
    ],
  })
  whoCanReplyGlobal?: '' | 'nobody' | 'configurable';

  @SelectField<BlueskyFileSubmission>({
    label: 'whoCanReply',
    section: 'website',
    span: 6,
    allowMultiple: true,
    options: [],
    derive: [
      {
        key: 'whoCanReplyConfigurable',
        populate: 'options',
      },
    ],
    minSelected: 1,
    showWhen: [['whoCanReplyGlobal', ['configurable']]],
  })
  whoCanReplyConfigurable?: string[];

  @BooleanField({ label: 'allowQuotePosts', section: 'website', span: 8 })
  allowQuotePosts = true;
}
