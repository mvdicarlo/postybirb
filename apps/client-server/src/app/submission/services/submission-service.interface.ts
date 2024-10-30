import { ISubmission, SubmissionMetadataType } from '@postybirb/types';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';

export interface ISubmissionService<
  T extends ISubmission<SubmissionMetadataType>,
> {
  populate(
    submission: T,
    createSubmissionDto: CreateSubmissionDto,
    file?: MulterFileInfo,
  ): Promise<void>;
}
