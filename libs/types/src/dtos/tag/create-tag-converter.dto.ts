import { ITagConverter } from '../../models';

export type ICreateTagConverterDto = Pick<ITagConverter, 'tag' | 'convertTo'>;
