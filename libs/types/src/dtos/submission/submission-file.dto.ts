import { ISubmissionFile } from '../../models';
import { IEntityDto } from '../database/entity.dto';

export type ISubmissionFileDto = Omit<
  IEntityDto<ISubmissionFile>,
  'altFile' | 'thumbnail' | 'file' | 'parent' | 'submission' | 'buffer'
> & {
  altFile?: ISubSubmissionFileDto;
  thumbnail?: ISubSubmissionFileDto;
  file: ISubSubmissionFileDto;
};

export type ISubSubmissionFileDto = Pick<
  ISubmissionFileDto,
  'id' | 'createdAt' | 'updatedAt' | 'fileName' | 'mimeType' | 'size'
>;
