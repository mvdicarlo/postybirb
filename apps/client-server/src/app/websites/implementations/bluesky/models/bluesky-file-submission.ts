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
      { value: 'configure', label: 'Configure' },
    ],
    customDerive(_, options) {
      if (options.whoCanReply && options.whoCanReplyGlobal === undefined) {
        switch (options.whoCanReply) {
          case 'nobody':
            // eslint-disable-next-line no-param-reassign
            options.whoCanReplyGlobal = 'nobody';
            break;
          case 'following':
          case 'mention':
          case 'mention,following':
            // eslint-disable-next-line no-param-reassign
            options.whoCanReplyGlobal = 'configure';
            break;
          default:
            break;
        }
      }
    },
  })
  whoCanReplyGlobal?: '' | 'nobody' | 'configure';

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
    showWhen: [['whoCanReplyGlobal', ['configure']]],
    customDerive(_, options) {
      if (
        options.whoCanReply !== 'nobody' &&
        options.whoCanReply !== '' &&
        !options.whoCanReplyConfigurable
      ) {
        // eslint-disable-next-line no-param-reassign
        options.whoCanReplyConfigurable = []
        switch (options.whoCanReply) {
          case 'following':
            options.whoCanReplyConfigurable.push(BlueskyWhoCanReply.Following);
            break;
          case 'mention':
            options.whoCanReplyConfigurable.push(BlueskyWhoCanReply.Mention);
            break;
          case 'mention,following':
            options.whoCanReplyConfigurable.push(
              BlueskyWhoCanReply.Mention,
              BlueskyWhoCanReply.Following,
            );
            break;
          default:
            break;
        }
      }
    },
  })
  whoCanReplyConfigurable?: string[];

  @BooleanField({ label: 'allowQuotePosts', section: 'website', span: 8 })
  allowQuotePosts = true;
}
