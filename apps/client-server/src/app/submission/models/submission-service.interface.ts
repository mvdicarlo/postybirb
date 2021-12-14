import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { Submission } from '../entities/submission.entity';
import { SubmissionMetadataType } from './submission-metadata-types.model';
import { Express } from 'express';
import 'multer';

export interface ISubmissionService<
  T extends Submission<SubmissionMetadataType>
> {
  populate(
    submission: T,
    createSubmissionDto: CreateSubmissionDto,
    file?: Express.Multer.File
  ): Promise<void>;

  remove?(submission: T): Promise<void>;
}
