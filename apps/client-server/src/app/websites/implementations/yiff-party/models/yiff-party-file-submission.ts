import { DescriptionField, TagField, TitleField } from '@postybirb/form-builder';
import {
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class YiffPartyFileSubmission extends BaseWebsiteOptions {
  @TitleField({ maxLength: 200, required: false })
  declare title: string;

  @DescriptionField({
    required: false,
    maxDescriptionLength: 5000,
    descriptionType: DescriptionType.PLAINTEXT,
  })
  declare description: DescriptionValue;

  // Yiff Party adds the artist tag bound to the API key by itself; these are
  // the other tags (plain = general, or species:, character:, copyright:, meta:).
  @TagField({ minTags: 5, spaceReplacer: '_' })
  tags: TagValue = DefaultTagValue();
}
