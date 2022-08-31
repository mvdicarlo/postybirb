import { Submission } from '../../database/entities';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { SubmissionMetadataType } from './submission-metadata-types';

export interface ISubmissionService<
  T extends Submission<SubmissionMetadataType>
> {
  populate(
    submission: T,
    createSubmissionDto: CreateSubmissionDto,
    file?: MulterFileInfo
  ): Promise<void>;

  remove?(submission: T): Promise<void>;
}
