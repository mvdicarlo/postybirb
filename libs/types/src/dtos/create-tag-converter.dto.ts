import { ITagConverter } from '@postybirb/types';

export type ICreateTagConverterDto = Pick<ITagConverter, 'tag' | 'convertTo'>;
