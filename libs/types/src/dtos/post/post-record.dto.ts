import { IPostRecord } from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { PostEventDto } from './post-event.dto';

export type PostRecordDto = Omit<IEntityDto<IPostRecord>, 'events'> & {
  events?: PostEventDto[];
};
