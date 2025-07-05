import { DescriptionField, TagField, TextField } from '@postybirb/form-builder';
import {
  DefaultTagValue,
  DescriptionType,
  DescriptionValue,
  TagValue,
} from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';

export class E621FileSubmission extends BaseWebsiteOptions {
  @DescriptionField({
    descriptionType: DescriptionType.HTML,
  })
  description: DescriptionValue;

  @TagField({
    col: 1,
    row: 1,
    minTags: 4,
    spaceReplacer: '_',
  })
  tags: TagValue = DefaultTagValue();

  @TextField({
    label: 'parentId',
  })
  parentId?: string;

  // Maybe creating ArrayField or splitting multiline TextField is better?
  @TextField({ label: 'source' })
  source1: string;

  @TextField({ label: 'source' })
  source2: string;

  @TextField({ label: 'source' })
  source3: string;

  @TextField({ label: 'source' })
  source4: string;

  @TextField({ label: 'source' })
  source5: string;

  @TextField({ label: 'source' })
  source6: string;

  @TextField({ label: 'source' })
  source7: string;

  @TextField({ label: 'source' })
  source8: string;

  @TextField({ label: 'source' })
  source9: string;

  @TextField({ label: 'source' })
  source10: string;
}
