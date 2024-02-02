import { IWebsitePostRecord } from '../../models';
import { IEntityDto } from '../database/entity.dto';

export type WebsitePostRecordDto = IEntityDto<
  Omit<IWebsitePostRecord, 'parent' | 'completedAt'>
> & { parentId: string; completedAt: string };
