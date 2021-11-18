import { Provider } from '@nestjs/common';
import { Connection } from 'typeorm';
import { DATABASE_CONNECTION, SUBMISSION_REPOSITORY } from '../../constants';
import { Submission } from '../entities/submission.entity';

// Submission database provider.
export const SubmissionProvider: Provider = {
  provide: SUBMISSION_REPOSITORY,
  useFactory: (connection: Connection) => connection.getRepository(Submission),
  inject: [DATABASE_CONNECTION],
};
