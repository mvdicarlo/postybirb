import { ITagConverter } from '@postybirb/types';

export type IUpdateTagConverterDto = Pick<
  ITagConverter,
  'id' | 'convertTo' | 'tag'
>;
