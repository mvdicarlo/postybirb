import { getDatabase } from '../database';
import { SubmissionFile } from '../entities/submission-file.entity';
import { SubmissionFileSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

export class SubmissionFileRepository extends EntityRepository<
  'SubmissionFileSchema',
  SubmissionFile
> {
  constructor() {
    super({
      schemaKey: 'SubmissionFileSchema',
      table: SubmissionFileSchema,
      query: getDatabase().query.SubmissionFileSchema,
      EntityClass: SubmissionFile,
    });
  }
}
