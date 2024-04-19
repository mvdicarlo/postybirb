/* eslint-disable no-param-reassign */
import { TagSupport, UnlimitedTags } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';

export type TagParserFunction = (tag: string) => string;

const DefaultTagParser: TagParserFunction = (tag) => tag;

export function SupportsTags(tagSupport?: TagSupport);
export function SupportsTags(
  tagSupport: TagSupport,
  tagParser: TagParserFunction
);
export function SupportsTags(
  tagSupport?: TagSupport,
  tagParser?: TagParserFunction
);
export function SupportsTags(tagParser?: TagParserFunction);
export function SupportsTags(
  tagSupportOrFunction?: TagSupport | TagParserFunction,
  tagParser?: TagParserFunction
) {
  const tagSupport: TagSupport =
    typeof tagSupportOrFunction === 'function'
      ? UnlimitedTags
      : tagSupportOrFunction;

  const tagParserFunction: TagParserFunction =
    typeof tagSupportOrFunction === 'function'
      ? tagSupportOrFunction
      : DefaultTagParser;

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
      constructor.prototype.tagParser = tagParser ?? tagParserFunction;
    };
  }
}
