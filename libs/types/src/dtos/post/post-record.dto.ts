import { IPostRecord } from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { WebsitePostRecordDto } from './website-post-record.dto';

export type PostRecordDto = IEntityDto<
  Omit<IPostRecord, 'parent' | 'completedAt' | 'children'>
> & {
  parentId: string;
  completedAt: string;
  children: WebsitePostRecordDto[];
};
