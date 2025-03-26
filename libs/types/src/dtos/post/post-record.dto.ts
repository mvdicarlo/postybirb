import { IPostRecord } from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { WebsitePostRecordDto } from './website-post-record.dto';

export type PostRecordDto = Omit<IEntityDto<IPostRecord>, 'children'> & {
  children: WebsitePostRecordDto[];
};
