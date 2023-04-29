import { ITagGroup } from '../../models';

export type IUpdateTagGroupDto = Pick<ITagGroup, 'id' | 'name' | 'tags'>;
