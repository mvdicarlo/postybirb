import { ITagGroup } from '../../models';

export type IUpdateTagGroupDto = Pick<ITagGroup, 'name' | 'tags'>;
