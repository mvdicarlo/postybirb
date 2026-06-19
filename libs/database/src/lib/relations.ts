import { defineRelations } from 'drizzle-orm';
import * as schema from './schemas';

/**
 * Relational Queries v2 relations definition. Replaces the per-schema
 * `relations()` bindings that previously lived co-located in each
 * `*.schema.ts` file. Table keys mirror the schema barrel export names
 * (e.g. `SubmissionSchema`), so `db.query.SubmissionSchema` continues to
 * resolve the same handle.
 *
 * Convention: `from`/`to` are declared on the foreign-key-owning side
 * (mirroring the v1 `fields`/`references`); the inverse side uses a bare
 * `r.one.*()` / `r.many.*()` which drizzle pairs automatically. The
 * self-referential PostRecord chain is disambiguated with `alias`.
 */
export const relations = defineRelations(schema, (r) => ({
  AccountSchema: {
    websiteOptions: r.many.WebsiteOptionsSchema(),
    websiteData: r.one.WebsiteDataSchema(),
  },
  WebsiteDataSchema: {
    account: r.one.AccountSchema({
      from: r.WebsiteDataSchema.id,
      to: r.AccountSchema.id,
    }),
  },
  WebsiteOptionsSchema: {
    account: r.one.AccountSchema({
      from: r.WebsiteOptionsSchema.accountId,
      to: r.AccountSchema.id,
    }),
    submission: r.one.SubmissionSchema({
      from: r.WebsiteOptionsSchema.submissionId,
      to: r.SubmissionSchema.id,
    }),
  },
  SubmissionSchema: {
    options: r.many.WebsiteOptionsSchema(),
    posts: r.many.PostRecordSchema(),
    files: r.many.SubmissionFileSchema(),
    postQueueRecord: r.one.PostQueueRecordSchema(),
  },
  PostRecordSchema: {
    submission: r.one.SubmissionSchema({
      from: r.PostRecordSchema.submissionId,
      to: r.SubmissionSchema.id,
    }),
    events: r.many.PostEventSchema(),
    /** The originating NEW PostRecord for this chain (null if this IS the origin) */
    origin: r.one.PostRecordSchema({
      from: r.PostRecordSchema.originPostRecordId,
      to: r.PostRecordSchema.id,
      alias: 'originChain',
    }),
    /** All CONTINUE/RETRY PostRecords that chain to this origin */
    chainedRecords: r.many.PostRecordSchema({
      alias: 'originChain',
    }),
  },
  PostEventSchema: {
    postRecord: r.one.PostRecordSchema({
      from: r.PostEventSchema.postRecordId,
      to: r.PostRecordSchema.id,
    }),
    account: r.one.AccountSchema({
      from: r.PostEventSchema.accountId,
      to: r.AccountSchema.id,
    }),
  },
  PostQueueRecordSchema: {
    submission: r.one.SubmissionSchema({
      from: r.PostQueueRecordSchema.submissionId,
      to: r.SubmissionSchema.id,
    }),
    postRecord: r.one.PostRecordSchema({
      from: r.PostQueueRecordSchema.postRecordId,
      to: r.PostRecordSchema.id,
    }),
  },
  SubmissionFileSchema: {
    submission: r.one.SubmissionSchema({
      from: r.SubmissionFileSchema.submissionId,
      to: r.SubmissionSchema.id,
    }),
    file: r.one.FileBufferSchema({
      from: r.SubmissionFileSchema.primaryFileId,
      to: r.FileBufferSchema.id,
    }),
    thumbnail: r.one.FileBufferSchema({
      from: r.SubmissionFileSchema.thumbnailId,
      to: r.FileBufferSchema.id,
    }),
    altFile: r.one.FileBufferSchema({
      from: r.SubmissionFileSchema.altFileId,
      to: r.FileBufferSchema.id,
    }),
  },
  DirectoryWatcherSchema: {
    template: r.one.SubmissionSchema({
      from: r.DirectoryWatcherSchema.templateId,
      to: r.SubmissionSchema.id,
    }),
  },
  UserSpecifiedWebsiteOptionsSchema: {
    account: r.one.AccountSchema({
      from: r.UserSpecifiedWebsiteOptionsSchema.accountId,
      to: r.AccountSchema.id,
    }),
  },
}));
