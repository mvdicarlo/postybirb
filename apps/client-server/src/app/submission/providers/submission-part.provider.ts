import { Provider } from '@nestjs/common';
import { Connection } from 'typeorm';
import {
  DATABASE_CONNECTION,
  SUBMISSION_PART_REPOSITORY,
} from '../../constants';
import { SubmissionPart } from '../entities/submission-part.entity';

// Submission part database provider.
export const SubmissionPartProvider: Provider = {
  provide: SUBMISSION_PART_REPOSITORY,
  useFactory: (connection: Connection) =>
    connection.getRepository(SubmissionPart),
  inject: [DATABASE_CONNECTION],
};
