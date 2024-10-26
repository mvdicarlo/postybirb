/* eslint-disable no-param-reassign */
import { TagValue } from '@postybirb/types';
import 'reflect-metadata';
import { FieldType } from '../types/field';
import { PrimitiveRecord } from '../types/primitive-record';
import { assignMetadata } from '../utils/assign-metadata';

type TagFormField = 'tag';
const TYPE_KEY = 'tag';

export type TagFieldType<T extends PrimitiveRecord = PrimitiveRecord> =
  FieldType<T, TagValue, TagFormField> & {
    minTags?: number;
    maxTags?: number;
  };

export function TagField<T extends PrimitiveRecord>(
  options: TagFieldType<T>,
): PropertyDecorator {
  options.type = TYPE_KEY;
  if (!options.formField) {
    options.formField = 'tag';
  }
  if (!options.i18nLabel) {
    options.i18nLabel = 'form.tags';
  }
  return (target, propertyKey) => {
    assignMetadata(target, propertyKey, TYPE_KEY, options);
  };
}
