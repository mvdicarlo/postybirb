import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PostyBirbDirectories, writeSync } from '@postybirb/fs';
import { FileSubmission, SubmissionType } from '@postybirb/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AccountService } from '../account/account.service';
import { DatabaseModule } from '../database/database.module';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { FileSubmissionService } from '../submission/services/file-submission.service';
import { MessageSubmissionService } from '../submission/services/message-submission.service';
import { SubmissionService } from '../submission/services/submission.service';
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

  function createMulterData(): MulterFileInfo {
    return {
      fieldname: 'file',
      originalname: 'powerbear.jpg',
      encoding: '',
      mimetype: 'image/jpeg',
      size: testFile.length,
      destination: '',
      filename: 'powerbear.jpg',
      path: `${PostyBirbDirectories.DATA_DIRECTORY}/test-file.jpg`,
      origin: undefined,
    };
  }

  beforeAll(() => {
    testFile = readFileSync(join(__dirname, '../test-files/powerbear.jpg'));
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        SubmissionService,
        CreateFileService,
        UpdateFileService,
        FileService,
        SubmissionService,
        FileSubmissionService,
        MessageSubmissionService,
        AccountService,
        WebsiteRegistryService,
        WebsiteOptionsService,
        WebsiteImplProvider,
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
    writeSync(`${PostyBirbDirectories.DATA_DIRECTORY}/test-file.jpg`, testFile);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create submission file', async () => {
    const submission = await createSubmission();
    const fileInfo = createMulterData();
    const file = await service.create(fileInfo, submission as FileSubmission);
    expect(file.file).toBeDefined();
    expect(file.thumbnail).toBeDefined();
    expect(file.fileName).toBe(fileInfo.originalname);
    expect(file.size).toBe(fileInfo.size);
    expect(file.hasThumbnail).toBe(true);
    expect(file.props.hasCustomThumbnail).toBe(false);
    expect(file.height).toBe(100);
    expect(file.width).toBe(100);
    expect(file.file.size).toBe(fileInfo.size);
    expect(file.file.height).toBe(100);
    expect(file.file.width).toBe(100);
    expect(file.file.parent.id).toEqual(file.id);
    expect(file.file.mimeType).toEqual(fileInfo.mimetype);
    expect(file.file.buffer).toEqual(testFile);
  }, 10_000);
});
