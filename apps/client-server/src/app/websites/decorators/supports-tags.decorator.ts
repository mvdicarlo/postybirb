/* eslint-disable no-param-reassign */
import { TagSupport, UnlimitedTags } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';

// TODO - write tests for this
export function SupportsTags(tagSupport?: TagSupport) {
  if (tagSupport && tagSupport.supportsTags) {
    if (tagSupport.minTags === undefined) {
      tagSupport.minTags = 0;
    }
    if (tagSupport.maxTags === undefined) {
      tagSupport.maxTags = Infinity;
    }
  }
  if (tagSupport === undefined) {
    return function website(constructor: Class<UnknownWebsite>) {
      constructor.prototype.tagSupport = UnlimitedTags;
    };
  }
}
