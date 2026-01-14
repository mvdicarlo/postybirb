import { IPostRecord } from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { PostEventDto } from './post-event.dto';
import { WebsitePostRecordDto } from './website-post-record.dto';

export type PostRecordDto = Omit<
  IEntityDto<IPostRecord>,
  'children' | 'events'
> & {
  children: WebsitePostRecordDto[];
  events?: PostEventDto[];
};
