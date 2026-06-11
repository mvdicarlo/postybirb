import { IPostTask } from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { PostUnitDto } from './post-unit.dto';

export type PostTaskDto = Omit<IEntityDto<IPostTask>, 'units'> & {
  units?: PostUnitDto[];
};
