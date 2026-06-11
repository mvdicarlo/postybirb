import { IPostJob } from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { PostTaskDto } from './post-task.dto';

export type PostJobDto = Omit<IEntityDto<IPostJob>, 'tasks'> & {
  tasks?: PostTaskDto[];
};
