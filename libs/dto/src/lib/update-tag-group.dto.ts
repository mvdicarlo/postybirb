import { ITagGroup } from '@postybirb/types';

export type IUpdateTagGroupDto = Pick<ITagGroup, 'id' | 'name' | 'tags'>;
