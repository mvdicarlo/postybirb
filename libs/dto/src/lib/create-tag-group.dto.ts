import { ITagGroup } from '@postybirb/types';

export type ICreateTagGroupDto = Pick<ITagGroup, 'name' | 'tags'>;
