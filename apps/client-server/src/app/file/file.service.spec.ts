import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import {
  clearDatabase,
  FileBufferRepository,
  SubmissionFile,
  SubmissionFileRepository,
} from '@postybirb/database';
import { PostyBirbDirectories, writeSync } from '@postybirb/fs';
import {
  CreateSubmissionDto,
  FileSubmission,
  SubmissionType,
} from '@postybirb/types';

import { readFileSync } from 'fs';
import { join } from 'path';
import { AccountTemplateDefaultsService } from '../account/account-template-defaults.service';
import { AccountService } from '../account/account.service';
import { CustomShortcutsService } from '../custom-shortcuts/custom-shortcuts.service';
import { FileConverterService } from '../file-converter/file-converter.service';
import { FormGeneratorService } from '../form-generator/form-generator.service';
import { SharpInstanceManager } from '../image-processing/sharp-instance-manager';
import { noopPlatformProvider } from '../platform/testing/noop-platform-providers';
import { DescriptionParserService } from '../post-parsers/parsers/description-parser.service';
import { TagParserService } from '../post-parsers/parsers/tag-parser.service';
import { TitleParser } from '../post-parsers/parsers/title-parser';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { PostingActivityModule } from '../posting/posting-activity.module';
import { SettingsService } from '../settings/settings.service';

import { FileSubmissionService } from '../submission/services/file-submission.service';
import { MessageSubmissionService } from '../submission/services/message-submission.service';
import { SubmissionService } from '../submission/services/submission.service';
import { SubmissionEventPublisher } from '../submission/submission-event.publisher';
import { TagConvertersService } from '../tag-converters/tag-converters.service';
import { UserConvertersService } from '../user-converters/user-converters.service';
import { ValidationService } from '../validation/validation.service';
import { WebsiteOptionsMigrationService } from '../website-options/website-options-migration.service';
import { WebsiteOptionsService } from '../website-options/website-options.service';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { FileService } from './file.service';
import { MulterFileInfo } from './models/multer-file-info';
import { CreateFileService } from './services/create-file.service';
import { UpdateFileService } from './services/update-file.service';

describe('FileService', () => {
  let testFile: Buffer | null = null;
  let testFile2: Buffer | null = null;
  let service: FileService;
  let submissionService: SubmissionService;
  let module: TestingModule;
  let fileBufferRepository: FileBufferRepository;

  async function createSubmission() {
    const dto = new CreateSubmissionDto();
    dto.name = 'test';
    dto.type = SubmissionType.MESSAGE; // Use message submission just for the sake of insertion

    const record = await submissionService.create(dto);
    return record;
  }

  function createMulterData(path: string): MulterFileInfo {
    return {
      fieldname: 'file',
      originalname: 'small_image.jpg',
      encoding: '',
      mimetype: 'image/jpeg',
      size: testFile?.length ?? 0,
      destination: '',
      filename: 'small_image.jpg',
      path,
      origin: undefined,
    };
  }

  function createMulterData2(path: string): MulterFileInfo {
    return {
      fieldname: 'file',
      originalname: 'png_with_alpha.png',
      encoding: '',
      mimetype: 'image/png',
      size: testFile2?.length ?? 0,
      destination: '',
      filename: 'png_with_alpha.jpg',
      path,
      origin: undefined,
    };
  }

  function setup(): string[] {
    const path = `${PostyBirbDirectories.DATA_DIRECTORY}/${Date.now()}.jpg`;
    const path2 = `${PostyBirbDirectories.DATA_DIRECTORY}/${Date.now()}.png`;

    writeSync(path, testFile!);
    writeSync(path2, testFile2!);
    return [path, path2];
  }

  beforeAll(() => {
    testFile = readFileSync(
      join(__dirname, '../../test-files/small_image.jpg'),
    );
    testFile2 = readFileSync(
      join(__dirname, '../../test-files/png_with_alpha.png'),
    );
  });

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), PostingActivityModule],
      providers: [
        AccountTemplateDefaultsService,
        SubmissionService,
        CreateFileService,
        UpdateFileService,
        SharpInstanceManager,
        FileService,
        ValidationService,
        SubmissionService,
        FileSubmissionService,
        MessageSubmissionService,
        AccountService,
        WebsiteRegistryService,
        WebsiteOptionsService,
        WebsiteOptionsMigrationService,
        SubmissionEventPublisher,
        WebsiteImplProvider,
        PostParsersService,
        TagParserService,
        DescriptionParserService,
        TitleParser,
        TagConvertersService,
        SettingsService,
        FormGeneratorService,
        FileConverterService,
        CustomShortcutsService,
        UserConvertersService,
        ...[noopPlatformProvider],
      ],
    }).compile();
    fileBufferRepository = new FileBufferRepository();
    service = module.get<FileService>(FileService);
    submissionService = module.get<SubmissionService>(SubmissionService);

    const accountService = module.get<AccountService>(AccountService);
    await accountService.onModuleInit();
  });

  async function loadBuffers(rec: SubmissionFile) {
    // !bug - https://github.com/drizzle-team/drizzle-orm/issues/3497
    // eslint-disable-next-line no-param-reassign
    rec.file = await fileBufferRepository.findByIdOrThrow(rec.primaryFileId);
    // eslint-disable-next-line no-param-reassign
    rec.thumbnail = rec.thumbnailId
      ? (await fileBufferRepository.findById(rec.thumbnailId)) || undefined
      : undefined;
    // eslint-disable-next-line no-param-reassign
    rec.altFile = rec.altFileId
      ? (await fileBufferRepository.findById(rec.altFileId)) || undefined
      : undefined;
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create submission file', async () => {
    const path = setup();
    const submission = await createSubmission();
    const fileInfo = createMulterData(path[0]);
    const file = await service.create(
      fileInfo,
      submission as unknown as FileSubmission,
    );
    await loadBuffers(file);
    expect(file.file).toBeDefined();
    expect(file.thumbnail).toBeDefined();
    expect(file.thumbnail?.fileName.startsWith('thumbnail_')).toBe(true);
    expect(file.fileName).toBe(fileInfo.originalname);
    expect(file.size).toBe(fileInfo.size);
    expect(file.hasThumbnail).toBe(true);
    expect(file.hasCustomThumbnail).toBe(false);
    expect(file.height).toBe(202);
    expect(file.width).toBe(138);
    expect(file.file.size).toBe(fileInfo.size);
    expect(file.file.height).toBe(202);
    expect(file.file.width).toBe(138);
    expect(file.file.submissionFileId).toEqual(file.id);
    expect(file.file.mimeType).toEqual(fileInfo.mimetype);
    expect(file.file.buffer).toEqual(testFile);
  });

  it('should not update submission file when hash is same', async () => {
    const path = setup();
    const submission = await createSubmission();
    const fileInfo = createMulterData(path[0]);
    const file = await service.create(
      fileInfo,
      submission as unknown as FileSubmission,
    );
    await loadBuffers(file);
    expect(file.file).toBeDefined();

    const path2 = setup();
    const updateFileInfo: MulterFileInfo = {
      fieldname: 'file',
      originalname: 'small_image.jpg',
      encoding: '',
      mimetype: 'image/png',
      size: testFile?.length ?? 0,
      destination: '',
      filename: 'small_image.jpg',
      path: path2[0],
      origin: undefined,
    };
    const updatedFile = await service.update(updateFileInfo, file.id, false);
    await loadBuffers(updatedFile);
    expect(updatedFile.file).toBeDefined();
    expect(updatedFile.thumbnail).toBeDefined();
    expect(updatedFile.fileName).toBe(updateFileInfo.originalname);
    expect(updatedFile.size).toBe(updateFileInfo.size);
    expect(updatedFile.hasThumbnail).toBe(true);
    expect(updatedFile.hasCustomThumbnail).toBe(false);
    expect(updatedFile.height).toBe(202);
    expect(updatedFile.width).toBe(138);
    expect(updatedFile.file.size).toBe(updateFileInfo.size);
    expect(updatedFile.file.height).toBe(202);
    expect(updatedFile.file.width).toBe(138);
    expect(updatedFile.file.submissionFileId).toEqual(file.id);
    expect(updatedFile.file.mimeType).not.toEqual(updateFileInfo.mimetype);
    expect(updatedFile.file.buffer).toEqual(testFile);
  });

  it('should update submission primary file', async () => {
    const path = setup();
    const submission = await createSubmission();
    const fileInfo = createMulterData(path[0]);
    const file = await service.create(
      fileInfo,
      submission as unknown as FileSubmission,
    );
    await loadBuffers(file);
    expect(file.file).toBeDefined();

    const path2 = setup();
    const updateFileInfo = createMulterData2(path2[1]);
    const updatedFile = await service.update(updateFileInfo, file.id, false);
    await loadBuffers(updatedFile);
    expect(updatedFile.file).toBeDefined();
    expect(updatedFile.thumbnail).toBeDefined();
    expect(updatedFile.fileName).toBe(updateFileInfo.filename);
    expect(updatedFile.size).toBe(updateFileInfo.size);
    expect(updatedFile.hasThumbnail).toBe(true);
    expect(updatedFile.hasCustomThumbnail).toBe(false);
    expect(updatedFile.height).toBe(600);
    expect(updatedFile.width).toBe(600);
    expect(updatedFile.file.size).toBe(updateFileInfo.size);
    expect(updatedFile.file.height).toBe(600);
    expect(updatedFile.file.width).toBe(600);
    expect(updatedFile.file.submissionFileId).toEqual(file.id);
    expect(updatedFile.file.mimeType).toEqual(updateFileInfo.mimetype);
    expect(updatedFile.file.buffer).toEqual(testFile2);
  });

  it('should cleanup entities on transaction failure', async () => {
    const path = setup();
    const submission = await createSubmission();
    const fileInfo = createMulterData(path[0]);

    // Get initial count of entities
    const initialFiles = await new SubmissionFileRepository().findAll();
    const initialBuffers = await fileBufferRepository.findAll();
    const initialFileCount = initialFiles.length;
    const initialBufferCount = initialBuffers.length;

    // Mock a method to throw an error partway through creation
    const createFileService = module.get<CreateFileService>(CreateFileService);
    const originalMethod = createFileService.createFileBufferEntity;
    let callCount = 0;
    jest
      .spyOn(createFileService, 'createFileBufferEntity')
      .mockImplementation(async (...args) => {
        callCount++;
        // Fail on the second buffer creation (thumbnail)
        if (callCount === 2) {
          throw new Error('Simulated error during buffer creation');
        }
        return originalMethod.apply(createFileService, args);
      });

    // Attempt to create a file, which should fail and trigger cleanup
    await expect(
      service.create(fileInfo, submission as unknown as FileSubmission),
    ).rejects.toThrow('Simulated error during buffer creation');

    // Verify that entities were cleaned up
    const finalFiles = await new SubmissionFileRepository().findAll();
    const finalBuffers = await fileBufferRepository.findAll();

    expect(finalFiles.length).toBe(initialFileCount);
    expect(finalBuffers.length).toBe(initialBufferCount);

    // Restore the original method
    jest.restoreAllMocks();
  });

  describe('missing thumbnail backfill', () => {
    async function createImageWithoutThumbnail(
      id = 'missing-image',
      buffer = testFile!,
    ) {
      const submission = await createSubmission();
      const repository = new SubmissionFileRepository();
      const file = await repository.insert({
        id,
        submissionId: submission.id,
        fileName: 'sample.jpg',
        mimeType: 'image/jpeg',
        hash: 'original-hash',
        size: buffer.length,
        width: 138,
        height: 202,
        hasThumbnail: false,
      });
      const source = await fileBufferRepository.insert({
        submissionFileId: file.id,
        buffer,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: buffer.length,
        width: file.width,
        height: file.height,
      });
      return repository.update(file.id, { primaryFileId: source.id });
    }

    it('saves missing thumbnails at startup and does not regenerate them', async () => {
      const file = await createImageWithoutThumbnail();
      const generate = jest.spyOn(
        module.get(CreateFileService),
        'generateThumbnail',
      );

      await service.onModuleInit();
      await service.onModuleInit();

      const updated = await service.findFile(file.id);
      await loadBuffers(updated);
      expect(updated.hasThumbnail).toBe(true);
      expect(updated.hasCustomThumbnail).toBe(false);
      expect(updated.thumbnailId).toBeTruthy();
      expect(updated.thumbnail?.fileName).toBe('thumbnail_sample.jpg');
      expect(updated.thumbnail?.width).toBeLessThanOrEqual(400);
      expect(updated.thumbnail?.height).toBeLessThanOrEqual(400);
      expect(updated.file.buffer).toEqual(testFile);
      expect(updated.hash).toBe(file.hash);
      expect(generate).toHaveBeenCalledTimes(1);
      generate.mockRestore();
    });

    it('preserves custom thumbnails and repairs a stale availability flag', async () => {
      const file = await createImageWithoutThumbnail();
      await service.ensureThumbnail(file.id);
      const repository = new SubmissionFileRepository();
      const before = await repository.update(file.id, {
        hasThumbnail: false,
        hasCustomThumbnail: true,
      });
      const thumbnail = await fileBufferRepository.findByIdOrThrow(
        before.thumbnailId,
      );

      await service.onModuleInit();

      const after = await service.findFile(file.id);
      expect(after.hasThumbnail).toBe(true);
      expect(after.hasCustomThumbnail).toBe(true);
      expect(after.thumbnailId).toBe(before.thumbnailId);
      expect(
        (await fileBufferRepository.findByIdOrThrow(after.thumbnailId)).buffer,
      ).toEqual(thumbnail.buffer);
    });

    it('continues past invalid images without marking them as generated', async () => {
      const invalid = await createImageWithoutThumbnail(
        'invalid-image',
        Buffer.from('not an image'),
      );
      const valid = await createImageWithoutThumbnail();

      await service.onModuleInit();

      expect((await service.findFile(invalid.id)).hasThumbnail).toBe(false);
      expect((await service.findFile(invalid.id)).thumbnailId).toBeFalsy();
      expect((await service.findFile(valid.id)).hasThumbnail).toBe(true);
    });

    it('skips non-image files', async () => {
      const file = await createImageWithoutThumbnail();
      await new SubmissionFileRepository().update(file.id, {
        mimeType: 'application/pdf',
      });

      await service.onModuleInit();

      expect((await service.findFile(file.id)).thumbnailId).toBeFalsy();
    });

    it('visits every batch even when files cannot be repaired', async () => {
      const submission = await createSubmission();
      await new SubmissionFileRepository().insert(
        Array.from({ length: 101 }, (_, index) => ({
          id: `missing-image-${String(index).padStart(3, '0')}`,
          submissionId: submission.id,
          fileName: 'sample.jpg',
          mimeType: 'image/jpeg',
          hash: 'original-hash',
          size: 0,
          width: 0,
          height: 0,
          hasThumbnail: false,
        })),
      );
      const generate = jest
        .spyOn(service, 'ensureThumbnail')
        .mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(generate).toHaveBeenCalledTimes(101);
      expect(generate).toHaveBeenLastCalledWith('missing-image-100');
      generate.mockRestore();
    });
  });
});
