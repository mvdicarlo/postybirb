import { IDirectoryWatcher, SubmissionId } from '../../models';
import { IEntityDto } from '../database/entity.dto';

export type DirectoryWatcherDto = Omit<
  IEntityDto<IDirectoryWatcher>,
  'template'
> & {
  template?: SubmissionId;
};
