import {
  DescriptionField,
  SelectField,
  TagField,
  TextField,
} from '@postybirb/form-builder';
import {
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  Tag,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class BlueskyFileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.PLAINTEXT,
    maxDescriptionLength: Infinity, // Custom lenght calculation is handled by validation logic
  })
  description: DescriptionValue;

  @TagField({
    col: 1,
    row: 1,
    spaceReplacer: '_',
  })
  tags: TagValue = DefaultTagValue();

  override processTag(tag: string) {
    return `#${tag.replaceAll(/[^a-z0-9]/gi, '_')}`;
  }

  override joinTags(tags: Tag[]): string {
    return tags.join(' ');
  }

  @SelectField({
    label: 'rating',
    options: [
      { value: '', label: 'Suitable for all ages' },
      { value: 'sexual', label: 'Adult: Suggestive' },
      { value: 'nudity', label: 'Adult: Nudity' },
      { value: 'porn', label: 'Adult: Porn' },
    ],
  })
  label_rating: '' | 'sexual' | 'nudity' | 'porn';

  @TextField({ label: 'replyToUrl' })
  replyToUrl?: string;

  @SelectField({
    label: 'threadgate',
    options: [
      { value: '', label: 'Everybody' },
      { value: 'nobody', label: 'Nobody' },
      { value: 'mention', label: 'Mentioned Users' },
      { value: 'following', label: 'Followed Users' },
      { value: 'mention,following', label: 'Mentioned & Followed Users' },
    ],
  })
  threadgate?: '' | 'nobody' | 'mention' | 'following' | 'mention,following';
}
