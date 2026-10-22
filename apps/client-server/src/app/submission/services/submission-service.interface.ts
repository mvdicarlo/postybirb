import {
  CreateSubmissionDto,
  ISubmission,
  SubmissionMetadataType,
} from '@postybirb/types';

import { MulterFileInfo } from '../../file/models/multer-file-info';

export interface ISubmissionService<
  T extends ISubmission<SubmissionMetadataType>,
> {
  populate(
    submission: T,
    createSubmissionDto: CreateSubmissionDto,
    file?: MulterFileInfo,
  ): Promise<void>;
}
