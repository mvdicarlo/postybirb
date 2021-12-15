import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { Submission } from '../entities/submission.entity';
import { SubmissionMetadataType } from './submission-metadata-types.model';
import { MulterFileInfo } from '../../file/models/multer-file-info.interface';

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
