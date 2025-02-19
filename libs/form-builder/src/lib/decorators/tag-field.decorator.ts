import { DefaultTagValue, TagValue } from '@postybirb/types';
import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

type TagExtraFields = {
  minTags?: number;
  maxTags?: number;
  maxTagLength?: number;
  minTagLength?: number;
  spaceReplacer?: string;
};

export const TagField = createFieldDecorator<TagValue, TagExtraFields>('tag')({
  defaults: {
    formField: 'tag',
    label: 'tags',
    defaultValue: DefaultTagValue(),
    minTagLength: 1,
    spaceReplacer: '_',
  },
});
