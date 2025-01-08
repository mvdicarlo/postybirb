import { TagField } from '@postybirb/form-builder';
import { TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class DiscordFileSubmission extends BaseWebsiteOptions {
  @TagField({
    hidden: true,
  })
  tags: TagValue;
}
