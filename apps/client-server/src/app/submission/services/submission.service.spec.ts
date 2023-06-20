import { MikroORM } from '@mikro-orm/core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostyBirbDirectories, writeSync } from '@postybirb/fs';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AccountService } from '../../account/account.service';
import { DatabaseModule } from '../../database/database.module';
import { FileService } from '../../file/file.service';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { CreateFileService } from '../../file/services/create-file.service';
import { UpdateFileService } from '../../file/services/update-file.service';
import { WebsiteOptionsService } from '../../website-options/website-options.service';
import { WebsiteImplProvider } from '../../websites/implementations';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { UpdateSubmissionDto } from '../dtos/update-submission.dto';
import { FileSubmissionService } from './file-submission.service';
import { MessageSubmissionService } from './message-submission.service';
import { SubmissionService } from './submission.service';

describe('SubmissionService', () => {
  let testFile: Buffer | null = null;
  let service: SubmissionService;
  let module: TestingModule;
  let orm: MikroORM;

  beforeAll(() => {
    PostyBirbDirectories.initializeDirectories();
    testFile = readFileSync(join(__dirname, '../../test-files/powerbear.jpg'));
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        SubmissionService,
        CreateFileService,
        UpdateFileService,
        FileService,
        FileSubmissionService,
        MessageSubmissionService,
        AccountService,
        WebsiteRegistryService,
        WebsiteOptionsService,
        WebsiteImplProvider,
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }
  });

  afterAll(async () => {
    await orm.close(true);
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
      originalname: 'powerbear.jpg',
      encoding: '',
      mimetype: 'image/jpeg',
      size: testFile.length,
      destination: '',
      filename: 'powerbear.jpg',
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
    const defaultOptions = record.options[0];

    const records = await service.findAll();
    expect(records).toHaveLength(1);
    expect(records[0].type).toEqual(createDto.type);
    expect(records[0].options).toHaveLength(1);
    expect(record.toJSON()).toEqual({
      id: record.id,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      type: record.type,
      isScheduled: false,
      schedule: {
        scheduledFor: undefined,
        scheduleType: ScheduleType.SINGLE,
      },
      metadata: {},
      files: [],
      options: [
        {
          id: defaultOptions.id,
          createdAt: defaultOptions.createdAt.toISOString(),
          updatedAt: defaultOptions.updatedAt.toISOString(),
          isDefault: true,
          submission: record.id,
          data: {
            rating: 'GENERAL',
            tags: {
              overrideDefault: false,
              tags: [],
            },
            title: 'Test',
          },
        },
      ],
    });
  });

  it('should throw exception on message submission with provided file', async () => {
    const createDto = createSubmissionDto();
    createDto.type = SubmissionType.MESSAGE;
    await expect(
      service.create(createDto, {} as MulterFileInfo)
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
    expect(record.toJSON()).toEqual({
      id: record.id,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      type: record.type,
      isScheduled: false,
      schedule: {
        scheduledFor: undefined,
        scheduleType: ScheduleType.SINGLE,
      },
      metadata: {
        fileMetadata: {
          [file.id]: {
            altText: '',
            dimensions: {
              default: {
                fileId: file.id,
                height: 100,
                width: 100,
              },
            },
            ignoredWebsites: [],
          },
        },
        order: [file.id],
      },
      files: [
        {
          createdAt: file.createdAt.toISOString(),
          file: file.file.id,
          fileName: fileInfo.originalname,
          hasThumbnail: true,
          hash: file.hash,
          height: 100,
          width: 100,
          id: file.id,
          mimeType: fileInfo.mimetype,
          props: {
            hasCustomThumbnail: false,
          },
          size: testFile.length,
          submission: record.id,
          thumbnail: file.thumbnail?.id,
          updatedAt: file.updatedAt.toISOString(),
        },
      ],
      options: [
        {
          id: defaultOptions.id,
          createdAt: defaultOptions.createdAt.toISOString(),
          updatedAt: defaultOptions.updatedAt.toISOString(),
          isDefault: true,
          submission: record.id,
          data: {
            rating: 'GENERAL',
            tags: {
              overrideDefault: false,
              tags: [],
            },
            title: 'Test',
          },
        },
      ],
    });
  });

  it('should throw on missing file on file submission', async () => {
    const createDto = createSubmissionDto();
    createDto.type = SubmissionType.FILE;
    await expect(service.create(createDto)).rejects.toThrow(
      BadRequestException
    );
  });

  it('should remove entities', async () => {
    const fileService = module.get<FileService>(FileService);
    const optionsService = module.get<WebsiteOptionsService>(
      WebsiteOptionsService
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
      NotFoundException
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
    };

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
          title: 'Updated',
        },
      },
    ];

    const updatedRecord = await service.update(record.id, updateDto);
    expect(updatedRecord.options[0].data.title).toEqual('Updated');
  });
});
