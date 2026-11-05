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
import { sql } from 'drizzle-orm';
import { MigrateWebsiteOptions } from '../../../decorators/migrate-website-options.decorator';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export enum BlueskyWhoCanReply {
  Mention = 'mention',
  Following = 'following',
  Followers = 'followers',
}

@MigrateWebsiteOptions([
  {
    version: 1,
    name: 'Convert reply permissions to array to allow more fine grained control',

    where: ({ data }) => sql`json_type(${data}, '$.whoCanReply') = 'text'`,
    migrate(raw) {
      if (typeof raw.whoCanReply !== 'string') {
        return { ...raw };
      }

      const { whoCanReply, ...data } = raw as {
        whoCanReply: string;
        whoCanReplyGlobal: string;
        whoCanReplyConfigurable: string[];
      };
      data.whoCanReplyGlobal = !whoCanReply
        ? ''
        : whoCanReply === 'nobody'
          ? 'nobody'
          : 'configurable';

      if (data.whoCanReplyGlobal === 'configurable') {
        data.whoCanReplyConfigurable = [];
        data.whoCanReplyConfigurable.push(...whoCanReply.split(','));
      }

      return data;
    },
  },
])
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
    showWhen: [['whoCanReplyGlobal', ['configurable']]],
  })
  whoCanReplyConfigurable?: string[];

  @BooleanField({ label: 'allowQuotePosts', section: 'website', span: 8 })
  allowQuotePosts = true;
}
