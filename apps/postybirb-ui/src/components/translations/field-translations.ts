import { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/macro';
import { FieldTranslations } from '@postybirb/types';

export const FieldLabelTranslations: {
  [K in keyof FieldTranslations]: MessageDescriptor;
} = {
  description: msg`Description`,
  tags: msg`Tags`,
  title: msg`Title`,
  rating: msg`Rating`,
  species: msg`Species`,
  contentWarning: msg`Content warning`,
  feature: msg`Feature`,
};