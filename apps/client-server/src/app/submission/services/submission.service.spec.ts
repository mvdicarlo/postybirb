import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { PostyBirbDirectories, writeSync } from '@postybirb/fs';
import {
  IWebsiteFormFields,
  ScheduleType,
  SubmissionRating,
  SubmissionType,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AccountModule } from '../../account/account.module';
import { AccountService } from '../../account/account.service';
import { FileConverterService } from '../../file-converter/file-converter.service';
import { FileService } from '../../file/file.service';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { CreateFileService } from '../../file/services/create-file.service';
import { UpdateFileService } from '../../file/services/update-file.service';
import { FormGeneratorModule } from '../../form-generator/form-generator.module';
import { PostParsersModule } from '../../post-parsers/post-parsers.module';
import { UserSpecifiedWebsiteOptionsModule } from '../../user-specified-website-options/user-specified-website-options.module';
import { UserSpecifiedWebsiteOptionsService } from '../../user-specified-website-options/user-specified-website-options.service';
import { ValidationService } from '../../validation/validation.service';
import { WebsiteOptionsService } from '../../website-options/website-options.service';
import { WebsiteImplProvider } from '../../websites/implementations/provider';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { WebsitesModule } from '../../websites/websites.module';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { UpdateSubmissionDto } from '../dtos/update-submission.dto';
import { FileSubmissionService } from './file-submission.service';
import { MessageSubmissionService } from './message-submission.service';
import { SubmissionService } from './submission.service';

describe('SubmissionService', () => {
  let testFile: Buffer | null = null;
  let service: SubmissionService;
  let module: TestingModule;

  beforeAll(() => {
    PostyBirbDirectories.initializeDirectories();
    testFile = readFileSync(
      join(__dirname, '../../test-files/small_image.jpg'),
    );
  });

  beforeEach(async () => {
    clearDatabase();
    try {
      module = await Test.createTestingModule({
        imports: [
          AccountModule,
          WebsitesModule,
          UserSpecifiedWebsiteOptionsModule,
          PostParsersModule,
          FormGeneratorModule,
        ],
        providers: [
          SubmissionService,
          CreateFileService,
          UpdateFileService,
          FileService,
          FileSubmissionService,
          MessageSubmissionService,
          AccountService,
          WebsiteRegistryService,
          UserSpecifiedWebsiteOptionsService,
          ValidationService,
          WebsiteOptionsService,
          WebsiteImplProvider,
          FileConverterService,
        ],
      }).compile();

      service = module.get<SubmissionService>(SubmissionService);
      const accountService = module.get<AccountService>(AccountService);
      await accountService.onModuleInit();
    } catch (e) {
      console.error(e);
    }
  });

  afterAll(async () => {
    await module.close();
  });

  function setup(): string {
    const path = `${PostyBirbDirectories.DATA_DIRECTORY}/${Date.now()}.jpg`;
    writeSync(path, testFile);
    return path;
  }

  function createSubmissionDto(): CreateSubmissionDto {
    const dto = new CreateSubmissionDto();
    dto.name = 'Test';
    dto.type = SubmissionType.MESSAGE;
    return dto;
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create message entities', async () => {
    const createDto = createSubmissionDto();
    const record = await service.create(createDto);

    const records = await service.findAll();
    expect(records).toHaveLength(1);
    expect(records[0].type).toEqual(createDto.type);
    expect(records[0].options).toHaveLength(1);
    expect(record.toDTO()).toEqual({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      type: record.type,
      isScheduled: false,
      isTemplate: false,
      isArchived: false,
      isMultiSubmission: false,
      schedule: {
        scheduleType: ScheduleType.NONE,
      },
      metadata: {},
      files: [],
      order: 1,
      posts: [],
      postQueueRecord: undefined,
      options: [record.options[0].toDTO()],
      validations: [],
    });
  });

  it('should delete entity', async () => {
    const createDto = createSubmissionDto();
    const record = await service.create(createDto);

    const records = await service.findAll();
    expect(records).toHaveLength(1);
    expect(records[0].type).toEqual(createDto.type);

    await service.remove(record.id);
    expect(await service.findAll()).toHaveLength(0);
  });

  it('should throw exception on message submission with provided file', async () => {
    const createDto = createSubmissionDto();
    createDto.type = SubmissionType.MESSAGE;
    await expect(
      service.create(createDto, {} as MulterFileInfo),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create file entities', async () => {
    const createDto = createSubmissionDto();
    createDto.type = SubmissionType.FILE;
    const path = setup();
    const fileInfo = createMulterData(path);

    const record = await service.create(createDto, fileInfo);
    const defaultOptions = record.options[0];
    const file = record.files[0];

    const records = await service.findAll();
    expect(records).toHaveLength(1);
    expect(records[0].type).toEqual(createDto.type);
    expect(records[0].options).toHaveLength(1);
    expect(records[0].files).toHaveLength(1);
    expect(record.toDTO()).toEqual({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      type: record.type,
      isScheduled: false,
      postQueueRecord: undefined,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      schedule: {
        scheduleType: ScheduleType.NONE,
      },
      metadata: {
        fileMetadata: {
          [file.id]: {
            altText: '',
            dimensions: {
              default: {
                fileId: file.id,
                height: 202,
                width: 138,
              },
            },
            ignoredWebsites: [],
          },
        },
        order: [file.id],
      },
      files: [
        {
          createdAt: file.createdAt,
          primaryFileId: file.primaryFileId,
          fileName: fileInfo.originalname,
          hasThumbnail: true,
          hasCustomThumbnail: false,
          hasAltFile: false,
          hash: file.hash,
          height: 202,
          width: 138,
          id: file.id,
          mimeType: fileInfo.mimetype,
          size: testFile.length,
          submissionId: record.id,
          altFileId: null,
          thumbnailId: file.thumbnailId,
          updatedAt: file.updatedAt,
        },
      ],
      posts: [],
      order: 1,
      options: [defaultOptions.toObject()],
      validations: [],
    });
  });

  it('should throw on missing file on file submission', async () => {
    const createDto = createSubmissionDto();
    createDto.type = SubmissionType.FILE;
    await expect(service.create(createDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should remove entities', async () => {
    const fileService = module.get<FileService>(FileService);
    const optionsService = module.get<WebsiteOptionsService>(
      WebsiteOptionsService,
    );

    const createDto = createSubmissionDto();
    createDto.type = SubmissionType.FILE;
    const path = setup();
    const fileInfo = createMulterData(path);

    const record = await service.create(createDto, fileInfo);
    const fileId = record.files[0].id;

    expect(await service.findAll()).toHaveLength(1);
    expect(await optionsService.findAll()).toHaveLength(1);
    expect(await fileService.findFile(fileId)).toBeDefined();

    await service.remove(record.id);
    expect(await service.findAll()).toHaveLength(0);
    expect(await optionsService.findAll()).toHaveLength(0);
    await expect(fileService.findFile(fileId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should update entity props', async () => {
    const createDto = createSubmissionDto();
    const record = await service.create(createDto);

    const updateDto = new UpdateSubmissionDto();
    updateDto.isScheduled = true;
    updateDto.scheduleType = ScheduleType.RECURRING;
    updateDto.scheduledFor = '*';
    updateDto.metadata = {
      test: 'test',
    } as unknown;

    const updatedRecord = await service.update(record.id, updateDto);
    expect(updatedRecord.isScheduled).toEqual(updateDto.isScheduled);
    expect(updatedRecord.schedule.scheduleType).toEqual(updateDto.scheduleType);
    expect(updatedRecord.schedule.scheduledFor).toEqual(updateDto.scheduledFor);
    expect(updatedRecord.metadata).toEqual(updateDto.metadata);
  });

  it('should remove entity options', async () => {
    const createDto = createSubmissionDto();
    const record = await service.create(createDto);

    const updateDto = new UpdateSubmissionDto();
    updateDto.deletedWebsiteOptions = [record.options[0].id];

    const updatedRecord = await service.update(record.id, updateDto);
    expect(updatedRecord.options).toHaveLength(0);
  });

  it('should update entity options', async () => {
    const createDto = createSubmissionDto();
    const record = await service.create(createDto);

    const updateDto = new UpdateSubmissionDto();
    updateDto.newOrUpdatedOptions = [
      {
        ...record.options[0],
        data: {
          rating: SubmissionRating.GENERAL,
          title: 'Updated',
        },
      } as unknown as WebsiteOptionsDto<IWebsiteFormFields>,
    ];

    const updatedRecord = await service.update(record.id, updateDto);
    expect(updatedRecord.options[0].data.title).toEqual('Updated');
  });

  it('should serialize entity', async () => {
    const createDto = createSubmissionDto();
    const record = await service.create(createDto);

    const serialized = JSON.stringify(record.toDTO());
    expect(serialized).toBeDefined();
  });

  it('should reorder entities', async () => {
    const createDto = createSubmissionDto();
    const record1 = await service.create(createDto);
    const record2 = await service.create(createDto);
    const record3 = await service.create(createDto);

    await service.reorder(record1.id, 1);
    const records = (await service.findAll()).sort((a, b) => a.order - b.order);
    expect(records[0].id).toEqual(record2.id);
    expect(records[1].id).toEqual(record1.id);
    expect(records[2].id).toEqual(record3.id);
  });

  // TODO: template apply test
});
