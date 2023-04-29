import { ITagConverter } from '../../models';

export type IUpdateTagConverterDto = Pick<
  ITagConverter,
  'id' | 'convertTo' | 'tag'
>;
