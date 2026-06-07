import {
  BooleanField,
  DescriptionField,
  TagField,
} from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class DiscordMessageSubmission extends BaseWebsiteOptions {
  @DescriptionField<DiscordMessageSubmission>({
    descriptionType: DescriptionType.MARKDOWN,
    maxDescriptionLength: 2000,
    customDerive(_, target) {
      if (target.useEmbed) {
        this.expectsInlineTitle = !target.useTitle;
      } else {
        // Use title is not applicable when useEmbed is disabled
        this.expectsInlineTitle = true;
      }
    },
  })
  description: DescriptionValue = DefaultDescriptionValue();

  @TagField({
    hidden: true,
  })
  tags: TagValue = DefaultTagValue();

  @BooleanField<DiscordMessageSubmission>({
    label: 'useTitle',
    section: 'website',
    span: 6,
    showWhen: [['useEmbed', [true]]],
  })
  useTitle = true;

  @BooleanField({ label: 'useEmbed', section: 'website', span: 6 })
  useEmbed = true;
}
