import type {
  ISubmissionMetadata,
  IWebsiteFormFields,
  SubmissionFileMetadata,
} from '@postybirb/types';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import { Account } from '../entities/account.entity';
import { PostQueueRecord } from '../entities/post-queue-record.entity';
import { SubmissionFile } from '../entities/submission-file.entity';
import { Submission } from '../entities/submission.entity';
import { WebsiteOptions } from '../entities/website-options.entity';
import { AccountRepository } from './account.repository';
import { createTestRepositories } from './base/test-utils';
import { PostQueueRecordRepository } from './post-queue-record.repository';
import { SubmissionFileRepository } from './submission-file.repository';
import { SubmissionRepository } from './submission.repository';
import { WebsiteOptionsRepository } from './website-options.repository';

/**
 * Submission-specific integration spec covering its dependency tree:
 *
 *   Submission
 files: SubmissionFile[] *     
 options: WebsiteOptions[] *     
 account: Account       *     
 postQueueRecord: PostQueueRecord *     
 *
 * (Posting state lives in the Relay job tables and is not part of the
 * submission graph.)
 */
describe('SubmissionRepository (full dependency tree)', () => {
  const repos = createTestRepositories({
    account: AccountRepository,
    submission: SubmissionRepository,
    file: SubmissionFileRepository,
    options: WebsiteOptionsRepository,
    queue: PostQueueRecordRepository,
  });

  type Seed = {
    submissionId: string;
    accountAId: string;
    accountBId: string;
    fileIds: string[];
    optionsIds: { default: string; secondary: string };
    queueId: string;
  };

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

    const queue = await repos.queue.insert({ submissionId: submission.id });

    return {
      submissionId: submission.id,
      accountAId: accountA.id,
      accountBId: accountB.id,
      fileIds: [file1.id, file2.id],
      optionsIds: {
        default: defaultOptions.id,
        secondary: secondaryOptions.id,
      },
      queueId: queue.id,
    };
  }

  describe('defaultWith hydration', () => {
    it('findById hydrates files, options+account, and queue', async () => {
      const seed = await seedFullGraph();
      const fetched = await repos.submission.findById(seed.submissionId);

      expect(fetched).toBeInstanceOf(Submission);

      expect(fetched?.files).toHaveLength(2);
      fetched?.files.forEach((f) => expect(f).toBeInstanceOf(SubmissionFile));
      expect(fetched?.files.map((f) => f.id).sort()).toEqual(
        [...seed.fileIds].sort(),
      );

      expect(fetched?.options).toHaveLength(2);
      fetched?.options.forEach((o) => {
        expect(o).toBeInstanceOf(WebsiteOptions);
        expect(o.account).toBeInstanceOf(Account);
      });
      const defaultOpt = fetched?.options.find((o) => o.isDefault);
      const secondaryOpt = fetched?.options.find((o) => !o.isDefault);
      expect(defaultOpt?.account?.id).toBe(seed.accountAId);
      expect(secondaryOpt?.account?.id).toBe(seed.accountBId);

      expect(fetched?.postQueueRecord).toBeInstanceOf(PostQueueRecord);
      expect(fetched?.postQueueRecord?.id).toBe(seed.queueId);
    });

    it('findAll hydrates the same graph for every row', async () => {
      await seedFullGraph();
      const all = await repos.submission.findAll();
      expect(all).toHaveLength(1);
      expect(all[0].files).toHaveLength(2);
      expect(all[0].options).toHaveLength(2);
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
      expect(empty.postQueueRecord).toBeUndefined();
    });

    it('getSubmissionName returns the default option title from the hydrated graph', async () => {
      const seed = await seedFullGraph();
      const fetched = await repos.submission.findById(seed.submissionId);
      expect(fetched?.getSubmissionName()).toBe('Default Title');
    });
  });

  describe('relation overrides', () => {
    it('find({ with: {} }) returns scalar-only rows (no relations loaded)', async () => {
      await seedFullGraph();
      const [row] = await repos.submission.find({ with: {} });
      expect(row.files).toBeUndefined();
      expect(row.options).toBeUndefined();
      expect(row.postQueueRecord).toBeUndefined();
    });

    it('find({ with: { files: true } }) loads only the requested relation', async () => {
      const seed = await seedFullGraph();
      const [row] = await repos.submission.find({ with: { files: true } });
      expect(row.files).toHaveLength(2);
      expect(row.options).toBeUndefined();
      expect(row.postQueueRecord).toBeUndefined();
      expect(row.files.map((f) => f.id).sort()).toEqual(
        [...seed.fileIds].sort(),
      );
    });
  });

  describe('cascade behaviour on delete', () => {
    it('deleting a submission cascades to files, options, and queue', async () => {
      const seed = await seedFullGraph();

      await repos.submission.deleteById([seed.submissionId]);

      expect(await repos.submission.findById(seed.submissionId)).toBeNull();

      for (const id of seed.fileIds) {
        // eslint-disable-next-line no-await-in-loop
        expect(await repos.file.findById(id)).toBeNull();
      }

      expect(await repos.options.findById(seed.optionsIds.default)).toBeNull();
      expect(
        await repos.options.findById(seed.optionsIds.secondary),
      ).toBeNull();

      expect(await repos.queue.findById(seed.queueId)).toBeNull();

      // accounts are NOT  they exist independently of submissionscascaded 
      expect(await repos.account.findById(seed.accountAId)).not.toBeNull();
      expect(await repos.account.findById(seed.accountBId)).not.toBeNull();
    });
  });
});
