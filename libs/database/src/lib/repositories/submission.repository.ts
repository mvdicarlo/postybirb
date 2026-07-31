import { getDatabase } from '../database';
import { Submission } from '../entities/submission.entity';
import { SubmissionSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';

/**
 * Default eager-load mirrors `SubmissionService` (the heaviest reader),
 * which always pulls `options + posts(+events+account) + postQueueRecord
 * + files`. Lighter consumers (`FileSubmissionService` etc.) call
 * `find({ with: { files: true } })` to override.
 */
export class SubmissionRepository extends EntityRepository<
  'SubmissionSchema',
  Submission
> {
  constructor() {
    super({
      schemaKey: 'SubmissionSchema',
      table: SubmissionSchema,
      query: getDatabase().query.SubmissionSchema,
      EntityClass: Submission,
      defaultWith: {
        options: { with: { account: true } },
        posts: { with: { events: { with: { account: true } } } },
        postQueueRecord: true,
        files: true,
      },
    });
  }
}
