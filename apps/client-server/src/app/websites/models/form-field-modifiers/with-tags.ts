import { IWebsiteFormFields, TagValue } from '@postybirb/types';

export interface WithTags {
  tags: TagValue;
  parseTag: (tag: string) => string;
}

export function isWithTags(
  model: IWebsiteFormFields,
): model is WithTags & IWebsiteFormFields {
  return 'tags' in model;
}
