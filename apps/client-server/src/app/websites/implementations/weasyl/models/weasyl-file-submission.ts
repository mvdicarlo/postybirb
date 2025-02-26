import { BooleanField, SelectField, TagField } from '@postybirb/form-builder';
import { TagValue } from '@postybirb/types';
import { BaseWebsiteOptions } from '../../../models/base-website-options';
import { WeasylCategories } from './weasyl-categories';

export class WeasylFileSubmission extends BaseWebsiteOptions {
  @TagField({
    required: true,
    minTags: 2,
  })
  tags: TagValue;

  @SelectField({
    col: 1,
    label: 'category',
    options: {
      options: WeasylCategories,
      discriminator: 'overallFileType',
    },
  })
  category: string;

  @SelectField({
    col: 1,
    label: 'folder',
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
    options: [],
  })
  folder: string;

  @BooleanField({ label: 'critique', col: 1 })
  critique = false;

  @BooleanField({ label: 'notify', col: 1 })
  notify = true;
}
