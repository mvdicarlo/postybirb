import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { PostyBirbDirectories, writeSync } from '@postybirb/fs';
import { FileSubmission, SubmissionType } from '@postybirb/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AccountService } from '../account/account.service';
import { CustomShortcutsService } from '../custom-shortcuts/custom-shortcuts.service';
import { SubmissionFile } from '../drizzle/models';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { FileConverterService } from '../file-converter/file-converter.service';
import { FormGeneratorService } from '../form-generator/form-generator.service';
import { DescriptionParserService } from '../post-parsers/parsers/description-parser.service';
import { TagParserService } from '../post-parsers/parsers/tag-parser.service';
import { TitleParser } from '../post-parsers/parsers/title-parser';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { SettingsService } from '../settings/settings.service';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { FileSubmissionService } from '../submission/services/file-submission.service';
import { MessageSubmissionService } from '../submission/services/message-submission.service';
import { SubmissionService } from '../submission/services/submission.service';
import { TagConvertersService } from '../tag-converters/tag-converters.service';
import { UserConvertersService } from '../user-converters/user-converters.service';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';
import { ValidationService } from '../validation/validation.service';
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
  let fileBufferRepository: PostyBirbDatabase<'FileBufferSchema'>;

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
      size: testFile.length,
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
      size: testFile2.length,
      destination: '',
      filename: 'png_with_alpha.jpg',
      path,
      origin: undefined,
    };
  }

  function setup(): string[] {
    const path = `${PostyBirbDirectories.DATA_DIRECTORY}/${Date.now()}.jpg`;
    const path2 = `${PostyBirbDirectories.DATA_DIRECTORY}/${Date.now()}.png`;

    writeSync(path, testFile);
    writeSync(path2, testFile2);
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
      providers: [
        UserSpecifiedWebsiteOptionsService,
        SubmissionService,
        CreateFileService,
        UpdateFileService,
        FileService,
        ValidationService,
        SubmissionService,
        FileSubmissionService,
        MessageSubmissionService,
        AccountService,
        WebsiteRegistryService,
        WebsiteOptionsService,
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
      ],
    }).compile();
    fileBufferRepository = new PostyBirbDatabase('FileBufferSchema');
    service = module.get<FileService>(FileService);
    submissionService = module.get<SubmissionService>(SubmissionService);

    const accountService = module.get<AccountService>(AccountService);
    await accountService.onModuleInit();
  });

  async function loadBuffers(rec: SubmissionFile) {
    // !bug - https://github.com/drizzle-team/drizzle-orm/issues/3497
    // eslint-disable-next-line no-param-reassign
    rec.file = await fileBufferRepository.findById(rec.primaryFileId);
    // eslint-disable-next-line no-param-reassign
    rec.thumbnail = rec.thumbnailId
      ? await fileBufferRepository.findById(rec.thumbnailId)
      : undefined;
    // eslint-disable-next-line no-param-reassign
    rec.altFile = rec.altFileId
      ? await fileBufferRepository.findById(rec.altFileId)
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
    expect(file.thumbnail.fileName.startsWith('thumbnail_')).toBe(true);
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
      size: testFile.length,
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
    const initialFiles = await new PostyBirbDatabase(
      'SubmissionFileSchema',
    ).findAll();
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
    const finalFiles = await new PostyBirbDatabase(
      'SubmissionFileSchema',
    ).findAll();
    const finalBuffers = await fileBufferRepository.findAll();

    expect(finalFiles.length).toBe(initialFileCount);
    expect(finalBuffers.length).toBe(initialBufferCount);

    // Restore the original method
    jest.restoreAllMocks();
  });
});
