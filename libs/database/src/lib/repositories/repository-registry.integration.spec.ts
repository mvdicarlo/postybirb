import type {
    ISubmissionMetadata,
    IWebsiteFormFields,
    SubmissionFileMetadata,
} from '@postybirb/types';
import {
    DirectoryWatcherImportAction,
    NodeStatus,
    PostRecordResumeMode,
    ScheduleType,
    SettingsConstants,
    SubmissionType,
} from '@postybirb/types';
import { saveFromEntity } from '../save-from-entity';
import { AccountRepository } from './account.repository';
import { RepositoryRegistry } from './base/repository-registry';
import { createTestRepositories } from './base/test-utils';
import { CustomShortcutRepository } from './custom-shortcut.repository';
import { DirectoryWatcherRepository } from './directory-watcher.repository';
import { FileBufferRepository } from './file-buffer.repository';
import { NotificationRepository } from './notification.repository';
import { PostJobRepository } from './post-job.repository';
import { PostQueueRecordRepository } from './post-queue-record.repository';
import { SettingsRepository } from './settings.repository';
import { SubmissionFileRepository } from './submission-file.repository';
import { SubmissionRepository } from './submission.repository';
import { TagConverterRepository } from './tag-converter.repository';
import { TagGroupRepository } from './tag-group.repository';
import { UserConverterRepository } from './user-converter.repository';
import { WebsiteDataRepository } from './website-data.repository';
import { WebsiteOptionsRepository } from './website-options.repository';

describe('RepositoryRegistry + saveFromEntity integration', () => {
  const ctors = {
    account: AccountRepository,
    customShortcut: CustomShortcutRepository,
    directoryWatcher: DirectoryWatcherRepository,
    fileBuffer: FileBufferRepository,
    notification: NotificationRepository,
    postQueueRecord: PostQueueRecordRepository,
    postJob: PostJobRepository,
    settings: SettingsRepository,
    submission: SubmissionRepository,
    submissionFile: SubmissionFileRepository,
    tagConverter: TagConverterRepository,
    tagGroup: TagGroupRepository,
    userConverter: UserConverterRepository,
    websiteData: WebsiteDataRepository,
    websiteOptions: WebsiteOptionsRepository,
  } as const;

  const repos = createTestRepositories(ctors);

  const schemaToCtor: Array<[keyof typeof ctors, string]> = [
    ['account', 'AccountSchema'],
    ['customShortcut', 'CustomShortcutSchema'],
    ['directoryWatcher', 'DirectoryWatcherSchema'],
    ['fileBuffer', 'FileBufferSchema'],
    ['notification', 'NotificationSchema'],
    ['postQueueRecord', 'PostQueueRecordSchema'],
    ['postJob', 'PostJobSchema'],
    ['settings', 'SettingsSchema'],
    ['submission', 'SubmissionSchema'],
    ['submissionFile', 'SubmissionFileSchema'],
    ['tagConverter', 'TagConverterSchema'],
    ['tagGroup', 'TagGroupSchema'],
    ['userConverter', 'UserConverterSchema'],
    ['websiteData', 'WebsiteDataSchema'],
    ['websiteOptions', 'WebsiteOptionsSchema'],
  ];

  it('every repository registers under its SchemaKey on construction', () => {
    for (const [key, schemaKey] of schemaToCtor) {
      // Access the proxy once so the underlying repo is built (test-utils
      // builds repos in `beforeEach`, so this is just a sanity touch).
      expect(repos[key]).toBeDefined();
      expect(RepositoryRegistry.has(schemaKey as never)).toBe(true);
    }
  });

  it('every entity class round-trips through saveFromEntity', async () => {
    // ---- common seed graph ---------------------------------------------
    const account = await repos.account.insert({
      name: 'integration-acct',
      website: 'demo',
      groups: ['g'],
    });
    const submission = await repos.submission.insert({
      type: SubmissionType.FILE,
      isScheduled: false,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: false,
      schedule: { scheduleType: ScheduleType.NONE },
      metadata: {} as ISubmissionMetadata,
      order: 0,
    });
    const submissionFile = await repos.submissionFile.insert({
      submissionId: submission.id,
      fileName: 'a.png',
      hash: 'h',
      mimeType: 'image/png',
      size: 1,
      width: 1,
      height: 1,
      hasThumbnail: false,
      metadata: {} as SubmissionFileMetadata,
    });
    const fileBuffer = await repos.fileBuffer.insert({
      submissionFileId: submissionFile.id,
      buffer: Buffer.from([1]),
      fileName: 'a.png',
      mimeType: 'image/png',
      size: 1,
      width: 1,
      height: 1,
    });
    const postJob = await repos.postJob.insert({
      submissionId: submission.id,
      status: NodeStatus.QUEUED,
      resumeMode: PostRecordResumeMode.NEW,
    });
    const postQueueRecord = await repos.postQueueRecord.insert({
      submissionId: submission.id,
    });
    const websiteData = await repos.websiteData.insert({
      id: account.id,
      data: { v: 1 },
    });
    const websiteOptions = await repos.websiteOptions.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: { title: 't' } as IWebsiteFormFields,
      isDefault: false,
    });
    const directoryWatcher = await repos.directoryWatcher.insert({
      path: '/tmp/x',
      importAction: DirectoryWatcherImportAction.NEW_SUBMISSION,
    });
    const customShortcut = await repos.customShortcut.insert({
      name: 's1',
      shortcut: { type: 'doc', content: [] },
    });
    const notification = await repos.notification.insert({
      title: 't',
      message: 'm',
      tags: [],
      data: {},
      type: 'info',
    });
    const settings = await repos.settings.insert({
      profile: 'p1',
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });
    const tagConverter = await repos.tagConverter.insert({
      tag: 'foo',
      convertTo: {},
    });
    const tagGroup = await repos.tagGroup.insert({
      name: 'g1',
      tags: [],
    });
    const userConverter = await repos.userConverter.insert({
      username: 'u1',
      convertTo: {},
    });

    const allEntities = [
      account,
      submission,
      submissionFile,
      fileBuffer,
      postJob,
      postQueueRecord,
      websiteData,
      websiteOptions,
      directoryWatcher,
      customShortcut,
      notification,
      settings,
      tagConverter,
      tagGroup,
      userConverter,
    ];

    // ---- saveFromEntity round-trip for each ---------------------------
    for (const entity of allEntities) {
      const previousUpdatedAt = entity.updatedAt;
      // Force at least 1ms of clock advance for the updatedAt assertion.
      
      await new Promise((r) => setTimeout(r, 2));
      
      const result = await saveFromEntity(entity);
      expect(result).toBe(entity);
      // updatedAt should have advanced after the update branch.
      expect(entity.updatedAt >= previousUpdatedAt).toBe(true);

      // The corresponding registered repo should be able to find it.
      const repo = RepositoryRegistry.get(entity.entitySchemaKey);
      
      const reread = await repo.findById(entity.id);
      expect(reread).not.toBeNull();
      expect(reread?.updatedAt).toBe(entity.updatedAt);
    }
  });
});
