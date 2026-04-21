import { clearDatabase } from '@postybirb/database';
import { ensureDirSync, PostyBirbDirectories, writeSync } from '@postybirb/fs';
import { NULL_ACCOUNT_ID, NullAccount, SubmissionRating, SubmissionType } from '@postybirb/types';
import { copyFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { LegacySubmissionConverter } from './legacy-submission.converter';

describe('LegacySubmissionConverter', () => {
  let converter: LegacySubmissionConverter;
  let templateConverter: LegacySubmissionConverter;
  let testDataPath: string;
  let submissionRepository: PostyBirbDatabase<'SubmissionSchema'>;
  let websiteOptionsRepository: PostyBirbDatabase<'WebsiteOptionsSchema'>;
  let submissionFileRepository: PostyBirbDatabase<'SubmissionFileSchema'>;
  let fileBufferRepository: PostyBirbDatabase<'FileBufferSchema'>;
  let accountRepository: PostyBirbDatabase<'AccountSchema'>;
  const ts = Date.now();

  /**
   * Replace {{FILE_PATH}} placeholders in submission test data with actual
   * paths to the test image files in the temp directory.
   */
  function prepareSubmissionData(testDataDir: string): void {
    const submissionsFilePath = join(testDataDir, 'submissions.db');
    const testImagePath = join(testDataDir, 'test-image.png').replace(/\\/g, '\\\\');
    const testImage2Path = join(testDataDir, 'test-image-2.png').replace(/\\/g, '\\\\');

    let content = readFileSync(submissionsFilePath, 'utf-8');
    content = content.replace(/\{\{FILE_PATH\}\}/g, testImagePath);
    content = content.replace(/\{\{FILE_PATH_2\}\}/g, testImage2Path);
    writeSync(submissionsFilePath, Buffer.from(content));
  }

  /**
   * Pre-populate the accounts that submissions reference via WebsiteOptions.
   * Must be done before submission import due to FK constraints.
   */
  async function createTestAccounts(): Promise<void> {
    // Create the NULL_ACCOUNT entry (required for default WebsiteOptions FK)
    await accountRepository.insert(new NullAccount());

    await accountRepository.insert({
      id: 'acc-discord-001',
      name: 'Discord Test',
      website: 'discord',
      groups: [],
    });

    await accountRepository.insert({
      id: 'acc-fa-001',
      name: 'FurAffinity Test',
      website: 'fur-affinity',
      groups: [],
    });
  }

  beforeEach(async () => {
    clearDatabase();

    // Setup test data directory with unique path
    testDataPath = `${PostyBirbDirectories.DATA_DIRECTORY}/legacy-db/${ts}/Submission-${v4()}`;
    const testDataDir = join(testDataPath, 'data');
    ensureDirSync(testDataDir);

    // Copy submissions.db
    const submissionsSource = join(
      __dirname,
      '../test-files/data/submissions.db',
    );
    writeSync(
      join(testDataDir, 'submissions.db'),
      readFileSync(submissionsSource),
    );

    // Copy submission-part.db
    const partsSource = join(
      __dirname,
      '../test-files/data/submission-part.db',
    );
    writeSync(
      join(testDataDir, 'submission-part.db'),
      readFileSync(partsSource),
    );

    // Copy submission-templates.db
    const templatesSource = join(
      __dirname,
      '../test-files/data/submission-templates.db',
    );
    writeSync(
      join(testDataDir, 'submission-templates.db'),
      readFileSync(templatesSource),
    );

    // Copy test images from the shared test-files directory
    const testImagesDir = join(__dirname, '../../../test-files');
    copyFileSync(
      join(testImagesDir, 'png_no_alpha.png'),
      join(testDataDir, 'test-image.png'),
    );
    copyFileSync(
      join(testImagesDir, 'png_with_alpha.png'),
      join(testDataDir, 'test-image-2.png'),
    );

    // Replace file path placeholders with actual paths
    prepareSubmissionData(testDataDir);

    converter = new LegacySubmissionConverter(testDataPath, false);
    templateConverter = new LegacySubmissionConverter(testDataPath, true);
    submissionRepository = new PostyBirbDatabase('SubmissionSchema');
    websiteOptionsRepository = new PostyBirbDatabase('WebsiteOptionsSchema');
    submissionFileRepository = new PostyBirbDatabase('SubmissionFileSchema');
    fileBufferRepository = new PostyBirbDatabase('FileBufferSchema');
    accountRepository = new PostyBirbDatabase('AccountSchema');

    // Pre-populate accounts (FK dependency)
    await createTestAccounts();
  });

  describe('submission imports', () => {
    it('should import all submissions', async () => {
      await converter.import();

      const submissions = await submissionRepository.findAll();
      expect(submissions).toHaveLength(5);
    });

    it('should map FILE type correctly', async () => {
      await converter.import();

      const sub = await submissionRepository.findById('sub-discord-file-001');
      expect(sub).toBeDefined();
      expect(sub!.type).toBe(SubmissionType.FILE);
    });

    it('should map NOTIFICATION to MESSAGE type', async () => {
      await converter.import();

      const sub = await submissionRepository.findById('sub-discord-notif-003');
      expect(sub).toBeDefined();
      expect(sub!.type).toBe(SubmissionType.MESSAGE);
    });

    it('should convert schedule correctly', async () => {
      await converter.import();

      // Unscheduled
      const unscheduled = await submissionRepository.findById(
        'sub-discord-file-001',
      );
      expect(unscheduled!.isScheduled).toBe(false);
      expect(unscheduled!.schedule.scheduleType).toBe('NONE');

      // Scheduled
      const scheduled = await submissionRepository.findById(
        'sub-fa-file-002',
      );
      expect(scheduled!.isScheduled).toBe(true);
      expect(scheduled!.schedule.scheduleType).toBe('SINGLE');
      expect(scheduled!.schedule.scheduledFor).toBeDefined();
    });

    it('should preserve order', async () => {
      await converter.import();

      const sub1 = await submissionRepository.findById('sub-discord-file-001');
      const sub2 = await submissionRepository.findById('sub-fa-file-002');
      expect(sub1!.order).toBe(1);
      expect(sub2!.order).toBe(2);
    });

    it('should mark submissions as initialized and not templates', async () => {
      await converter.import();

      const sub = await submissionRepository.findById('sub-discord-file-001');
      expect(sub!.isInitialized).toBe(true);
      expect(sub!.isTemplate).toBe(false);
      expect(sub!.isArchived).toBe(false);
      expect(sub!.isMultiSubmission).toBe(false);
    });

    it('should be idempotent (skip duplicates)', async () => {
      await converter.import();
      await converter.import(); // Run again

      const submissions = await submissionRepository.findAll();
      expect(submissions).toHaveLength(5);
    });
  });

  describe('website options (submission parts)', () => {
    it('should create default WebsiteOptions with NULL_ACCOUNT_ID', async () => {
      await converter.import();

      const options = await websiteOptionsRepository.findAll();
      const defaultOptions = options.filter((o) => o.isDefault);
      // 5 submissions, each with a default part
      expect(defaultOptions.length).toBeGreaterThanOrEqual(5);

      const discordDefault = defaultOptions.find(
        (o) => o.submissionId === 'sub-discord-file-001',
      );
      expect(discordDefault).toBeDefined();
      expect(discordDefault!.accountId).toBe(NULL_ACCOUNT_ID);
      expect(discordDefault!.isDefault).toBe(true);
    });

    it('should import Discord FILE part with correct field mappings', async () => {
      await converter.import();

      const options = await websiteOptionsRepository.findAll();
      const discordOption = options.find(
        (o) =>
          o.submissionId === 'sub-discord-file-001' &&
          o.accountId === 'acc-discord-001',
      );

      expect(discordOption).toBeDefined();
      expect(discordOption!.isDefault).toBe(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = discordOption!.data as any;
      // Discord-specific: spoiler → isSpoiler
      expect(data.isSpoiler).toBe(true);
      expect(data.useTitle).toBe(false);
      // Tags: extendDefault: false → overrideDefault: true
      expect(data.tags.overrideDefault).toBe(true);
      expect(data.tags.tags).toEqual(['discord-tag']);
      // Rating: 'general' → 'GENERAL'
      expect(data.rating).toBe(SubmissionRating.GENERAL);
      // ContentWarning from spoilerText
      expect(data.contentWarning).toBe('content warning text');
      // Description should be TipTap JSON
      expect(data.description.overrideDefault).toBe(true);
      expect(data.description.description.type).toBe('doc');
    });

    it('should import FurAffinity FILE part with website-specific fields', async () => {
      await converter.import();

      const options = await websiteOptionsRepository.findAll();
      const faOption = options.find(
        (o) =>
          o.submissionId === 'sub-fa-file-002' &&
          o.accountId === 'acc-fa-001',
      );

      expect(faOption).toBeDefined();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = faOption!.data as any;
      // FA-specific fields
      expect(data.category).toBe('1');
      expect(data.theme).toBe('1');
      expect(data.species).toBe('1');
      expect(data.gender).toBe('2');
      expect(data.folders).toEqual(['gallery']);
      expect(data.disableComments).toBe(false);
      expect(data.scraps).toBe(true);
      // Dropped field: reupload should NOT be present
      expect(data.reupload).toBeUndefined();
      // Rating: 'mature' → 'MATURE'
      expect(data.rating).toBe(SubmissionRating.MATURE);
    });

    it('should import Discord NOTIFICATION part as MESSAGE', async () => {
      await converter.import();

      const options = await websiteOptionsRepository.findAll();
      const discordNotif = options.find(
        (o) =>
          o.submissionId === 'sub-discord-notif-003' &&
          o.accountId === 'acc-discord-001',
      );

      expect(discordNotif).toBeDefined();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = discordNotif!.data as any;
      expect(data.useTitle).toBe(true);
      // Should NOT have isSpoiler (only for FILE type)
      expect(data.isSpoiler).toBeUndefined();
    });

    it('should import FurAffinity NOTIFICATION part with feature field', async () => {
      await converter.import();

      const options = await websiteOptionsRepository.findAll();
      const faNotif = options.find(
        (o) =>
          o.submissionId === 'sub-fa-notif-004' &&
          o.accountId === 'acc-fa-001',
      );

      expect(faNotif).toBeDefined();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = faNotif!.data as any;
      expect(data.feature).toBe(false);
    });

    it('should skip parts for unsupported/deprecated websites', async () => {
      await converter.import();

      const options = await websiteOptionsRepository.findAll();
      // The deprecated website (FurryNetwork) part should not create options
      const deprecatedOptions = options.filter(
        (o) =>
          o.submissionId === 'sub-deprecated-005' &&
          o.accountId === 'acc-deprecated',
      );
      expect(deprecatedOptions).toHaveLength(0);
    });

    it('should skip parts for missing accounts', async () => {
      // Don't create website accounts — converter should skip parts gracefully
      clearDatabase();

      // Still need NullAccount for default WebsiteOptions FK
      accountRepository = new PostyBirbDatabase('AccountSchema');
      await accountRepository.insert(new NullAccount());

      const freshConverter = new LegacySubmissionConverter(testDataPath, false);
      await freshConverter.import();

      const options = await websiteOptionsRepository.findAll();
      // Only default parts should be created (non-default parts need valid accounts)
      const nonDefaultOptions = options.filter((o) => !o.isDefault);
      expect(nonDefaultOptions).toHaveLength(0);
    });

    it('should convert tags with extendDefault inversion', async () => {
      await converter.import();

      const options = await websiteOptionsRepository.findAll();
      const defaultOption = options.find(
        (o) =>
          o.submissionId === 'sub-discord-file-001' && o.isDefault,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = defaultOption!.data as any;
      // extendDefault: true → overrideDefault: false
      expect(data.tags.overrideDefault).toBe(false);
      expect(data.tags.tags).toEqual(['tag1', 'tag2']);
    });

    it('should convert description HTML to TipTap JSON', async () => {
      await converter.import();

      const options = await websiteOptionsRepository.findAll();
      const discordOption = options.find(
        (o) =>
          o.submissionId === 'sub-discord-file-001' &&
          o.accountId === 'acc-discord-001',
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = discordOption!.data as any;
      expect(data.description.description.type).toBe('doc');
      expect(data.description.description.content).toBeDefined();
      expect(data.description.description.content.length).toBeGreaterThan(0);

      // The first block should be a paragraph with bold text
      const firstBlock = data.description.description.content[0];
      expect(firstBlock.type).toBe('paragraph');
    });

    it('should convert description with username shortcut', async () => {
      await converter.import();

      const options = await websiteOptionsRepository.findAll();
      const faDefault = options.find(
        (o) => o.submissionId === 'sub-fa-file-002' && o.isDefault,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = faDefault!.data as any;
      // The description contained {fa:testuser}, should be converted to a username node
      const paragraph = data.description.description.content[0];
      const usernameNode = paragraph.content?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (n: any) => n.type === 'username',
      );
      expect(usernameNode).toBeDefined();
      expect(usernameNode.attrs.shortcut).toBe('furaffinity');
      expect(usernameNode.attrs.username).toBe('testuser');
    });

    it('should convert rating from lowercase to uppercase', async () => {
      await converter.import();

      const options = await websiteOptionsRepository.findAll();
      const faDefault = options.find(
        (o) => o.submissionId === 'sub-fa-file-002' && o.isDefault,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = faDefault!.data as any;
      // 'adult' → 'ADULT'
      expect(data.rating).toBe(SubmissionRating.ADULT);
    });
  });

  describe('file submissions', () => {
    it('should import primary file for FILE submissions', async () => {
      await converter.import();

      const files = await submissionFileRepository.findAll();
      const discordFiles = files.filter(
        (f) => f.submissionId === 'sub-discord-file-001',
      );

      expect(discordFiles).toHaveLength(1);
      expect(discordFiles[0].fileName).toBe('test-image.png');
      expect(discordFiles[0].mimeType).toBe('image/png');
      expect(discordFiles[0].size).toBeGreaterThan(0);
    });

    it('should import primary + additional files', async () => {
      await converter.import();

      const files = await submissionFileRepository.findAll();
      const faFiles = files.filter(
        (f) => f.submissionId === 'sub-fa-file-002',
      );

      // Primary + 1 additional
      expect(faFiles).toHaveLength(2);
    });

    it('should create FileBuffer records for each file', async () => {
      await converter.import();

      const buffers = await fileBufferRepository.findAll();
      // At least 3 files: 1 for discord file sub, 2 for FA file sub
      expect(buffers.length).toBeGreaterThanOrEqual(3);

      // Verify buffer has actual content
      const firstBuffer = buffers[0];
      expect(firstBuffer.buffer).toBeDefined();
      expect(firstBuffer.size).toBeGreaterThan(0);
    });

    it('should compute hash for file content', async () => {
      await converter.import();

      const files = await submissionFileRepository.findAll();
      const discordFile = files.find(
        (f) => f.submissionId === 'sub-discord-file-001',
      );

      expect(discordFile!.hash).toBeDefined();
      expect(discordFile!.hash.length).toBe(64); // sha256 hex
    });

    it('should not import files for NOTIFICATION/MESSAGE submissions', async () => {
      await converter.import();

      const files = await submissionFileRepository.findAll();
      const notifFiles = files.filter(
        (f) => f.submissionId === 'sub-discord-notif-003',
      );

      expect(notifFiles).toHaveLength(0);
    });
  });

  describe('template imports', () => {
    it('should import templates with isTemplate flag', async () => {
      await templateConverter.import();

      const submissions = await submissionRepository.findAll();
      expect(submissions).toHaveLength(1);

      const template = submissions[0];
      expect(template.isTemplate).toBe(true);
      expect(template.isInitialized).toBe(true);
    });

    it('should set template name in metadata', async () => {
      await templateConverter.import();

      const template = await submissionRepository.findById('tmpl-001');
      expect(template).toBeDefined();
      expect(template!.metadata.template).toBeDefined();
      expect(template!.metadata.template!.name).toBe('Discord Template');
    });

    it('should extract inline parts from template and create WebsiteOptions', async () => {
      await templateConverter.import();

      const options = await websiteOptionsRepository.findAll();

      // Template should have default + Discord parts
      const templateOptions = options.filter(
        (o) => o.submissionId === 'tmpl-001',
      );
      expect(templateOptions.length).toBeGreaterThanOrEqual(2);

      // Check default option
      const defaultOption = templateOptions.find((o) => o.isDefault);
      expect(defaultOption).toBeDefined();
      expect(defaultOption!.accountId).toBe(NULL_ACCOUNT_ID);

      // Check Discord option
      const discordOption = templateOptions.find(
        (o) => o.accountId === 'acc-discord-001',
      );
      expect(discordOption).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = discordOption!.data as any;
      expect(data.isSpoiler).toBe(false);
      expect(data.useTitle).toBe(true);
    });

    it('should not import files for templates', async () => {
      await templateConverter.import();

      const files = await submissionFileRepository.findAll();
      expect(files).toHaveLength(0);
    });
  });
});
