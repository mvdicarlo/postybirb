import { ISubmissionFile } from '../../models';
import { IEntityDto } from '../database/entity.dto';

export type ISubmissionFileDto = Omit<
  IEntityDto<ISubmissionFile>,
  'altFile' | 'thumbnail' | 'file'
> & {
  altFile?: string;
  thumbnail?: string;
  file: string;
};
