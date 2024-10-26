import { TagValue } from './tag-value.type';

/** Default tag value {@link TagValue} */
export const DefaultTagValue = (): TagValue => ({
  overrideDefault: false,
  tags: [],
});
