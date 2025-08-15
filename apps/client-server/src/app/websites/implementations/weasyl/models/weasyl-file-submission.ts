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
    label: 'category',
    section: 'website',
    order: 2,
    span: 6,
    options: {
      options: WeasylCategories,
      discriminator: 'overallFileType',
    },
  })
  category: string;

  @SelectField({
    label: 'folder',
    section: 'website',
    order: 3,
    span: 6,
    derive: [
      {
        key: 'folders',
        populate: 'options',
      },
    ],
    options: [],
  })
  folder: string;

  @BooleanField({
    label: 'critique',
    section: 'website',
    order: 4,
    span: 6,
  })
  critique = false;

  @BooleanField({
    label: 'notify',
    section: 'website',
    order: 5,
    span: 6,
  })
  notify = true;
}
