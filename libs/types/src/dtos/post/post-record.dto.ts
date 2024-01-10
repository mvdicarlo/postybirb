import { IPostRecord } from '../../models';
import { IEntityDto } from '../database/entity.dto';

export type PostRecordDto = IEntityDto<
  Omit<IPostRecord, 'parent' | 'completedAt'>
> & { parentId: string; completedAt: string };
