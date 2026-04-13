import { DefaultTagValue, TagValue } from '@postybirb/types';
import 'reflect-metadata';
import { DescriptionFieldType } from '../types';
import { createFieldDecorator } from '../utils/assign-metadata';

type TagExtraFields = {
  searchProviderId?: string;
  minTags?: number;
  maxTags?: number;
  maxTagLength?: number;
  minTagLength?: number;
  spaceReplacer?: string;
  expectedInDescription?: boolean;
};

export const TagField = createFieldDecorator<TagValue, TagExtraFields>('tag')({
  defaults: {
    formField: 'tag',
    label: 'tags',
    defaultValue: DefaultTagValue(),
    minTagLength: 1,
    spaceReplacer: '_',
    expectedInDescription: false,
  },
  onCreate(fields, options) {
    // Ensure all fields have been initialized
    setImmediate(() => {
      if (options.expectedInDescription) {
        const description = fields.description as DescriptionFieldType;
        description.defaultValue.insertTags = true;
      }
    });
  },
});
