import {
  BooleanField,
  DescriptionField,
  TagField,
  TitleField,
} from '@postybirb/form-builder';
import { DescriptionType, DescriptionValue, TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import {
  DISCORD_COMPONENT_TEXT_LIMIT,
  getDiscordComponentHeading,
} from '../discord-components';

export class DiscordMessageSubmission extends BaseWebsiteOptions {
  @TitleField({
    required: false,
  })
  declare title: string;

  @DescriptionField<DiscordMessageSubmission>({
    descriptionType: DescriptionType.CUSTOM,
    required: false,
    maxDescriptionLength: DISCORD_COMPONENT_TEXT_LIMIT,
    customDerive(_, target) {
      this.maxDescriptionLength = Math.max(
        0,
        DISCORD_COMPONENT_TEXT_LIMIT -
          (target.useTitle
            ? getDiscordComponentHeading(target.title).length
            : 0),
      );
      this.expectsInlineTitle = !target.useTitle;
    },
  })
  declare description: DescriptionValue;

  @TagField({
    hidden: true,
  })
  declare tags: TagValue;

  @BooleanField({
    label: 'useTitle',
    section: 'website',
    order: 0,
    span: 6,
  })
  useTitle = true;
}
