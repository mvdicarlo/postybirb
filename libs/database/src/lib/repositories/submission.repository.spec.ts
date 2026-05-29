import {
  PostEventType,
  PostRecordResumeMode,
  PostRecordState,
  ScheduleType,
  SubmissionType,
} from '@postybirb/types';
import type {
  ISubmissionMetadata,
  IWebsiteFormFields,
  SubmissionFileMetadata,
} from '@postybirb/types';
import { Account } from '../entities/account.entity';
import { PostEvent } from '../entities/post-event.entity';
import { PostQueueRecord } from '../entities/post-queue-record.entity';
import { PostRecord } from '../entities/post-record.entity';
import { Submission } from '../entities/submission.entity';
import { SubmissionFile } from '../entities/submission-file.entity';
import { WebsiteOptions } from '../entities/website-options.entity';
import { AccountRepository } from './account.repository';
import { PostEventRepository } from './post-event.repository';
import { PostQueueRecordRepository } from './post-queue-record.repository';
import { PostRecordRepository } from './post-record.repository';
import { SubmissionFileRepository } from './submission-file.repository';
import { SubmissionRepository } from './submission.repository';
import { WebsiteOptionsRepository } from './website-options.repository';
import { createTestRepositories } from './base/test-utils';

/**
 * Submission-specific integration spec covering the **entire expected
 * dependency tree**.
 *
 * The generic EntityRepository surface (findById/find/insert/update/
 * deleteById/subscribers/count/select/notify) is covered by
 * `base/entity-repository.spec.ts`, which uses SubmissionRepository as
 * its vehicle. This file complements that with assertions that only
 * make sense for Submission's full `defaultWith` graph:
 *
 *   Submission
 *     ├── files: SubmissionFile[]
 *     ├── options: WebsiteOptions[]
 *     │      └── account: Account
 *     ├── posts: PostRecord[]
 *     │      └── events: PostEvent[]
 *     │             └── account: Account
 *     └── postQueueRecord: PostQueueRecord
 *
 * It also exercises cascade behaviour on delete across every dependent
 * schema and verifies the scalar override path.
 */
describe('SubmissionRepository (full dependency tree)', () => {
  const repos = createTestRepositories({
    account: AccountRepository,
    submission: SubmissionRepository,
    file: SubmissionFileRepository,
    options: WebsiteOptionsRepository,
    record: PostRecordRepository,
    event: PostEventRepository,
    queue: PostQueueRecordRepository,
  });

  type Seed = {
    submissionId: string;
    accountAId: string;
    accountBId: string;
    fileIds: string[];
    optionsIds: { default: string; secondary: string };
    recordIds: { origin: string; chained: string };
    eventIds: {
      originStarted: string;
      originFinished: string;
      chainedStarted: string;
    };
    queueId: string;
  };

  /**
   * Seeds a single Submission with the full dependency tree wired up:
   *   - 2 Accounts (so we can verify per-account hydration in nested rows)
   *   - 2 SubmissionFiles
   *   - 2 WebsiteOptions (one default → Account A, one secondary → Account B)
   *   - 2 PostRecords (origin + chained-via-originPostRecordId)
   *   - 3 PostEvents (two on origin, one on chained; mixed account FKs)
   *   - 1 PostQueueRecord (pointing at the origin PostRecord)
   */
  async function seedFullGraph(): Promise<Seed> {
    const accountA = await repos.account.insert({
      name: 'account-a',
      website: 'twitter',
      groups: ['primary'],
    });
    const accountB = await repos.account.insert({
      name: 'account-b',
      website: 'mastodon',
      groups: ['secondary'],
    });

    const submission = await repos.submission.insert({
      type: SubmissionType.FILE,
      isScheduled: false,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: true,
      schedule: { scheduleType: ScheduleType.NONE },
      metadata: {} as ISubmissionMetadata,
      order: 0,
    });

    const file1 = await repos.file.insert({
      submissionId: submission.id,
      fileName: 'first.png',
      hash: 'h1',
      mimeType: 'image/png',
      size: 100,
      width: 64,
      height: 64,
      hasThumbnail: false,
      metadata: {} as SubmissionFileMetadata,
    });
    const file2 = await repos.file.insert({
      submissionId: submission.id,
      fileName: 'second.png',
      hash: 'h2',
      mimeType: 'image/png',
      size: 200,
      width: 128,
      height: 128,
      hasThumbnail: false,
      metadata: {} as SubmissionFileMetadata,
    });

    const defaultOptions = await repos.options.insert({
      accountId: accountA.id,
      submissionId: submission.id,
      data: { title: 'Default Title' } as IWebsiteFormFields,
      isDefault: true,
    });
    const secondaryOptions = await repos.options.insert({
      accountId: accountB.id,
      submissionId: submission.id,
      data: { title: 'Secondary Title' } as IWebsiteFormFields,
      isDefault: false,
    });

    const originRecord = await repos.record.insert({
      submissionId: submission.id,
      state: PostRecordState.DONE,
      resumeMode: PostRecordResumeMode.NEW,
    });
    const chainedRecord = await repos.record.insert({
      submissionId: submission.id,
      state: PostRecordState.PENDING,
      resumeMode: PostRecordResumeMode.CONTINUE,
      originPostRecordId: originRecord.id,
    });

    const originStarted = await repos.event.insert({
      postRecordId: originRecord.id,
      accountId: accountA.id,
      eventType: PostEventType.POST_ATTEMPT_STARTED,
    });
    const originFinished = await repos.event.insert({
      postRecordId: originRecord.id,
      accountId: accountA.id,
      eventType: PostEventType.POST_ATTEMPT_COMPLETED,
      sourceUrl: 'https://example.test/post/1',
    });
    const chainedStarted = await repos.event.insert({
      postRecordId: chainedRecord.id,
      accountId: accountB.id,
      eventType: PostEventType.POST_ATTEMPT_STARTED,
    });

    const queue = await repos.queue.insert({
      submissionId: submission.id,
      postRecordId: originRecord.id,
    });

    return {
      submissionId: submission.id,
      accountAId: accountA.id,
      accountBId: accountB.id,
      fileIds: [file1.id, file2.id],
      optionsIds: {
        default: defaultOptions.id,
        secondary: secondaryOptions.id,
      },
      recordIds: { origin: originRecord.id, chained: chainedRecord.id },
      eventIds: {
        originStarted: originStarted.id,
        originFinished: originFinished.id,
        chainedStarted: chainedStarted.id,
      },
      queueId: queue.id,
    };
  }

  // ---------------------------------------------------------------------
  // defaultWith graph
  // ---------------------------------------------------------------------

  describe('defaultWith hydration', () => {
    it('findById hydrates every level of the dependency tree', async () => {
      const seed = await seedFullGraph();
      const fetched = await repos.submission.findById(seed.submissionId);

      expect(fetched).toBeInstanceOf(Submission);

      // --- files ---
      expect(fetched?.files).toHaveLength(2);
      fetched?.files.forEach((f) => expect(f).toBeInstanceOf(SubmissionFile));
      expect(fetched?.files.map((f) => f.id).sort()).toEqual(
        [...seed.fileIds].sort(),
      );

      // --- options + nested account ---
      expect(fetched?.options).toHaveLength(2);
      fetched?.options.forEach((o) => {
        expect(o).toBeInstanceOf(WebsiteOptions);
        expect(o.account).toBeInstanceOf(Account);
      });
      const defaultOpt = fetched?.options.find((o) => o.isDefault);
      const secondaryOpt = fetched?.options.find((o) => !o.isDefault);
      expect(defaultOpt?.account?.id).toBe(seed.accountAId);
      expect(secondaryOpt?.account?.id).toBe(seed.accountBId);

      // --- posts + nested events + nested account on each event ---
      expect(fetched?.posts).toHaveLength(2);
      fetched?.posts.forEach((p) => expect(p).toBeInstanceOf(PostRecord));

      const origin = fetched?.posts.find((p) => p.id === seed.recordIds.origin);
      const chained = fetched?.posts.find(
        (p) => p.id === seed.recordIds.chained,
      );
      expect(origin).toBeDefined();
      expect(chained).toBeDefined();
      expect(chained?.originPostRecordId).toBe(seed.recordIds.origin);

      expect(origin?.events).toHaveLength(2);
      origin?.events.forEach((e) => {
        expect(e).toBeInstanceOf(PostEvent);
        expect(e.account).toBeInstanceOf(Account);
        expect(e.account?.id).toBe(seed.accountAId);
      });

      expect(chained?.events).toHaveLength(1);
      expect(chained?.events[0].account?.id).toBe(seed.accountBId);

      // --- queue ---
      expect(fetched?.postQueueRecord).toBeInstanceOf(PostQueueRecord);
      expect(fetched?.postQueueRecord?.id).toBe(seed.queueId);
      expect(fetched?.postQueueRecord?.postRecordId).toBe(
        seed.recordIds.origin,
      );
    });

    it('findAll hydrates the same graph for every row', async () => {
      await seedFullGraph();
      const all = await repos.submission.findAll();
      expect(all).toHaveLength(1);
      expect(all[0].files).toHaveLength(2);
      expect(all[0].options).toHaveLength(2);
      expect(all[0].posts).toHaveLength(2);
      expect(all[0].postQueueRecord).toBeDefined();
    });

    it('newly inserted submission with no children has empty arrays and no queue', async () => {
      const empty = await repos.submission.insert({
        type: SubmissionType.MESSAGE,
        isScheduled: false,
        isTemplate: false,
        isMultiSubmission: false,
        isArchived: false,
        isInitialized: false,
        schedule: { scheduleType: ScheduleType.NONE },
        metadata: {} as ISubmissionMetadata,
        order: 0,
      });
      expect(empty.files).toEqual([]);
      expect(empty.options).toEqual([]);
      expect(empty.posts).toEqual([]);
      expect(empty.postQueueRecord).toBeUndefined();
    });

    it('getSubmissionName returns the default option title from the hydrated graph', async () => {
      const seed = await seedFullGraph();
      const fetched = await repos.submission.findById(seed.submissionId);
      expect(fetched?.getSubmissionName()).toBe('Default Title');
    });
  });

  // ---------------------------------------------------------------------
  // override path
  // ---------------------------------------------------------------------

  describe('relation overrides', () => {
    it('find({ with: {} }) returns scalar-only rows (no relations loaded)', async () => {
      await seedFullGraph();
      const [row] = await repos.submission.find({ with: {} });
      expect(row.files).toBeUndefined();
      expect(row.options).toBeUndefined();
      expect(row.posts).toBeUndefined();
      expect(row.postQueueRecord).toBeUndefined();
    });

    it('find({ with: { files: true } }) loads only the requested relation', async () => {
      const seed = await seedFullGraph();
      const [row] = await repos.submission.find({ with: { files: true } });
      expect(row.files).toHaveLength(2);
      expect(row.options).toBeUndefined();
      expect(row.posts).toBeUndefined();
      expect(row.postQueueRecord).toBeUndefined();
      expect(row.files.map((f) => f.id).sort()).toEqual(
        [...seed.fileIds].sort(),
      );
    });
  });

  // ---------------------------------------------------------------------
  // cascade deletes
  // ---------------------------------------------------------------------

  describe('cascade behaviour on delete', () => {
    it('deleting a submission cascades to files, options, posts, events, and queue', async () => {
      const seed = await seedFullGraph();

      await repos.submission.deleteById([seed.submissionId]);

      expect(await repos.submission.findById(seed.submissionId)).toBeNull();

      // files cascade directly off submission
      for (const id of seed.fileIds) {
        // eslint-disable-next-line no-await-in-loop
        expect(await repos.file.findById(id)).toBeNull();
      }

      // options cascade directly off submission
      expect(await repos.options.findById(seed.optionsIds.default)).toBeNull();
      expect(
        await repos.options.findById(seed.optionsIds.secondary),
      ).toBeNull();

      // post records cascade directly off submission
      expect(await repos.record.findById(seed.recordIds.origin)).toBeNull();
      expect(await repos.record.findById(seed.recordIds.chained)).toBeNull();

      // events cascade transitively through the deleted post records
      expect(
        await repos.event.findById(seed.eventIds.originStarted),
      ).toBeNull();
      expect(
        await repos.event.findById(seed.eventIds.originFinished),
      ).toBeNull();
      expect(
        await repos.event.findById(seed.eventIds.chainedStarted),
      ).toBeNull();

      // queue cascades directly off submission
      expect(await repos.queue.findById(seed.queueId)).toBeNull();

      // accounts are NOT cascaded — they exist independently of submissions
      expect(await repos.account.findById(seed.accountAId)).not.toBeNull();
      expect(await repos.account.findById(seed.accountBId)).not.toBeNull();
    });
  });
});
