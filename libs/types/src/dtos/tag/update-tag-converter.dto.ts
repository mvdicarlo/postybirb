import { ITagConverter } from '../../models';

export type IUpdateTagConverterDto = Pick<ITagConverter, 'convertTo' | 'tag'>;
