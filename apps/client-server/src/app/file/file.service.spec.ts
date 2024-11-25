import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PostyBirbDirectories, writeSync } from '@postybirb/fs';
import { FileSubmission, SubmissionType } from '@postybirb/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AccountService } from '../account/account.service';
import { DatabaseModule } from '../database/database.module';
import { FileConverterService } from '../file-converter/file-converter.service';
import { FormGeneratorService } from '../form-generator/form-generator.service';
import { DescriptionParserService } from '../post-parsers/parsers/description-parser.service';
import { TagParserService } from '../post-parsers/parsers/tag-parser.service';
import { TitleParserService } from '../post-parsers/parsers/title-parser.service';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { SettingsService } from '../settings/settings.service';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { FileSubmissionService } from '../submission/services/file-submission.service';
import { MessageSubmissionService } from '../submission/services/message-submission.service';
import { SubmissionService } from '../submission/services/submission.service';
import { TagConvertersService } from '../tag-converters/tag-converters.service';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';
import { ValidationService } from '../validation/validation.service';
import { WebsiteOptionsService } from '../website-options/website-options.service';
import { WebsiteImplProvider } from '../websites/implementations';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { FileService } from './file.service';
import { MulterFileInfo } from './models/multer-file-info';
import { CreateFileService } from './services/create-file.service';
import { UpdateFileService } from './services/update-file.service';

describe('FileService', () => {
  let testFile: Buffer | null = null;
  let service: FileService;
  let submissionService: SubmissionService;
  let module: TestingModule;
  let orm: MikroORM;

  async function createSubmission() {
    const dto = new CreateSubmissionDto();
    dto.name = 'test';
    dto.type = SubmissionType.MESSAGE;

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

  function setup(): string {
    const path = `${PostyBirbDirectories.DATA_DIRECTORY}/${Date.now()}.jpg`;
    writeSync(path, testFile);
    return path;
  }

  beforeAll(() => {
    PostyBirbDirectories.initializeDirectories();
    testFile = readFileSync(join(__dirname, '../test-files/small_image.jpg'));
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
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
        TitleParserService,
        TagConvertersService,
        SettingsService,
        FormGeneratorService,
        FileConverterService,
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    submissionService = module.get<SubmissionService>(SubmissionService);
    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }

    const accountService = module.get<AccountService>(AccountService);
    await accountService.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create submission file', async () => {
    const path = setup();
    const submission = await createSubmission();
    const fileInfo = createMulterData(path);
    const file = await service.create(
      fileInfo,
      submission as unknown as FileSubmission,
    );
    expect(file.file).toBeDefined();
    expect(file.thumbnail).toBeDefined();
    expect(file.fileName).toBe(fileInfo.originalname);
    expect(file.size).toBe(fileInfo.size);
    expect(file.hasThumbnail).toBe(true);
    expect(file.props.hasCustomThumbnail).toBe(false);
    expect(file.height).toBe(202);
    expect(file.width).toBe(138);
    expect(file.file.size).toBe(fileInfo.size);
    expect(file.file.height).toBe(202);
    expect(file.file.width).toBe(138);
    expect(file.file.parent.id).toEqual(file.id);
    expect(file.file.mimeType).toEqual(fileInfo.mimetype);
    expect(file.file.buffer).toEqual(testFile);
  });

  it('should not update submission file when hash is same', async () => {
    const path = setup();
    const submission = await createSubmission();
    const fileInfo = createMulterData(path);
    const file = await service.create(
      fileInfo,
      submission as unknown as FileSubmission,
    );
    expect(file.file).toBeDefined();

    const path2 = setup();
    const updateFileInfo = {
      fieldname: 'file',
      originalname: 'small_image.jpg',
      encoding: '',
      mimetype: 'image/png',
      size: testFile.length,
      destination: '',
      filename: 'small_image.jpg',
      path: path2,
      origin: undefined,
    };
    const updatedFile = await service.update(updateFileInfo, file.id, false);
    expect(updatedFile.file).toBeDefined();
    expect(updatedFile.thumbnail).toBeDefined();
    expect(updatedFile.fileName).toBe(updateFileInfo.originalname);
    expect(updatedFile.size).toBe(updateFileInfo.size);
    expect(updatedFile.hasThumbnail).toBe(true);
    expect(updatedFile.props.hasCustomThumbnail).toBe(false);
    expect(updatedFile.height).toBe(202);
    expect(updatedFile.width).toBe(138);
    expect(updatedFile.file.size).toBe(updateFileInfo.size);
    expect(updatedFile.file.height).toBe(202);
    expect(updatedFile.file.width).toBe(138);
    expect(updatedFile.file.parent.id).toEqual(file.id);
    expect(updatedFile.file.mimeType).not.toEqual(updateFileInfo.mimetype);
    expect(updatedFile.file.buffer).toEqual(testFile);
  });
});
