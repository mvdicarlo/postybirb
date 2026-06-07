import { DescriptionField, TagField } from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class NewgroundsBaseSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue = DefaultDescriptionValue();

  @TagField({
    maxTags: 12,
    spaceReplacer: '-',
  })
  tags: TagValue = DefaultTagValue();

  protected processTag(tag: string): string {
    return tag
      .replace(/(\(|\)|:|#|;|\]|\[|')/g, '')
      .replace(/_/g, '-')
      .toLowerCase();
  }
}
