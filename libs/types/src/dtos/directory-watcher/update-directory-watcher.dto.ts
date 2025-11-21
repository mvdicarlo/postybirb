import { IDirectoryWatcher, SubmissionId } from '../../models';

export type IUpdateDirectoryWatcherDto = Partial<
  Pick<IDirectoryWatcher, 'importAction' | 'path'>
> & {
  templateId?: SubmissionId;
};
