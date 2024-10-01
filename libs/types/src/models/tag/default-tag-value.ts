import { TagValue } from './tag-value.type';

/** Default tag value @type {TagValue} */
export const DefaultTagValue = (): TagValue => ({
  overrideDefault: false,
  tags: [],
});
