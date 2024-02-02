import { ITagGroup } from '../../models';

export type ICreateTagGroupDto = Pick<ITagGroup, 'name' | 'tags'>;
