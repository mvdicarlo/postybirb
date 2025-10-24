import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { DirectoryWatcherImportAction, SubmissionType } from '@postybirb/types';
import { mkdir, readdir, rename, writeFile } from 'fs/promises';
import { join } from 'path';
import { AccountService } from '../account/account.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { SubmissionService } from '../submission/services/submission.service';
import { SubmissionModule } from '../submission/submission.module';
import { DirectoryWatchersService } from './directory-watchers.service';
import { CreateDirectoryWatcherDto } from './dtos/create-directory-watcher.dto';
import { UpdateDirectoryWatcherDto } from './dtos/update-directory-watcher.dto';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  mkdir: jest.fn(),
  rename: jest.fn(),
  writeFile: jest.fn(),
}));

describe('DirectoryWatchersService', () => {
  let service: DirectoryWatchersService;
  let submissionService: SubmissionService;
  let accountService: AccountService;
  let module: TestingModule;

  beforeEach(async () => {
    clearDatabase();

    // Setup mocks
    (readdir as jest.Mock).mockResolvedValue([]);
    (mkdir as jest.Mock).mockResolvedValue(undefined);
    (rename as jest.Mock).mockResolvedValue(undefined);
    (writeFile as jest.Mock).mockResolvedValue(undefined);

    module = await Test.createTestingModule({
      imports: [SubmissionModule, NotificationsModule],
      providers: [DirectoryWatchersService],
    }).compile();

    service = module.get<DirectoryWatchersService>(DirectoryWatchersService);
    submissionService = module.get<SubmissionService>(SubmissionService);
    accountService = module.get<AccountService>(AccountService);

    await accountService.onModuleInit();
  });

  async function createSubmission() {
    const dto = new CreateSubmissionDto();
    dto.name = 'test';
    dto.type = SubmissionType.MESSAGE;
    dto.isTemplate = true;

    const record = await submissionService.create(dto);
    return record;
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(module).toBeDefined();
  });

  it('should create entities and setup directory structure', async () => {
    const dto = new CreateDirectoryWatcherDto();
    dto.importAction = DirectoryWatcherImportAction.NEW_SUBMISSION;
    dto.path = 'path';

    await service.create(dto);

    // Verify directory structure was created
    expect(mkdir).toHaveBeenCalledWith(join('path', 'processing'), {
      recursive: true,
    });
    expect(mkdir).toHaveBeenCalledWith(join('path', 'completed'), {
      recursive: true,
    });
    expect(mkdir).toHaveBeenCalledWith(join('path', 'failed'), {
      recursive: true,
    });

    const entities = await service.findAll();
    const record = entities[0];
    expect(record.path).toBe(dto.path);
    expect(record.importAction).toBe(dto.importAction);
  });

  it('should update entities', async () => {
    const dto = new CreateDirectoryWatcherDto();
    dto.importAction = DirectoryWatcherImportAction.NEW_SUBMISSION;
    dto.path = 'path';

    const record = await service.create(dto);
    expect(record.path).toBe(dto.path);
    expect(record.importAction).toBe(dto.importAction);

    const updateDto = new UpdateDirectoryWatcherDto();
    updateDto.path = 'updated-path';
    const updatedRecord = await service.update(record.id, updateDto);
    expect(updatedRecord.path).toBe(updateDto.path);

    // Verify directory structure was created for new path
    expect(mkdir).toHaveBeenCalledWith(join('updated-path', 'processing'), {
      recursive: true,
    });
  });

  it('should support templates', async () => {
    const template = await createSubmission();
    const dto = new CreateDirectoryWatcherDto();
    dto.importAction = DirectoryWatcherImportAction.NEW_SUBMISSION;
    dto.path = 'path';
    const record = await service.create(dto);
    expect(record.path).toBe(dto.path);
    const updateDto = new UpdateDirectoryWatcherDto();
    updateDto.templateId = template.id;

    const updatedRecord = await service.update(record.id, updateDto);
    expect(updatedRecord.templateId).toBe(template.id);
    expect(updatedRecord.toDTO()).toEqual({
      createdAt: updatedRecord.createdAt,
      updatedAt: updatedRecord.updatedAt,
      id: updatedRecord.id,
      importAction: DirectoryWatcherImportAction.NEW_SUBMISSION,
      path: 'path',
      templateId: template.id,
    });

    await submissionService.remove(template.id);
    const rec = await service.findById(updatedRecord.id);
    expect(rec.templateId).toBe(null);
  });

  it('should throw error if path does not exist', async () => {
    (readdir as jest.Mock).mockRejectedValue(new Error('Path not found'));

    const dto = new CreateDirectoryWatcherDto();
    dto.importAction = DirectoryWatcherImportAction.NEW_SUBMISSION;
    dto.path = 'non-existent-path';

    await expect(service.create(dto)).rejects.toThrow(
      "Path 'non-existent-path' does not exist or is not accessible",
    );
  });

  it('should create entity without path (UI flow)', async () => {
    const dto = new CreateDirectoryWatcherDto();
    dto.importAction = DirectoryWatcherImportAction.NEW_SUBMISSION;
    // No path provided

    const record = await service.create(dto);

    // Verify entity was created without path
    expect(record.importAction).toBe(dto.importAction);
    expect(record.path).toBeNull();

    // Verify no directory structure was created
    expect(mkdir).not.toHaveBeenCalled();
  });

  it('should create directory structure when path is first set via update', async () => {
    // Create without path
    const dto = new CreateDirectoryWatcherDto();
    dto.importAction = DirectoryWatcherImportAction.NEW_SUBMISSION;
    const record = await service.create(dto);

    expect(record.path).toBeNull();

    // Clear mocks from create
    jest.clearAllMocks();

    // Update with path
    const updateDto = new UpdateDirectoryWatcherDto();
    updateDto.path = 'new-path';
    const updatedRecord = await service.update(record.id, updateDto);

    expect(updatedRecord.path).toBe('new-path');

    // Verify directory structure was created
    expect(mkdir).toHaveBeenCalledWith(join('new-path', 'processing'), {
      recursive: true,
    });
    expect(mkdir).toHaveBeenCalledWith(join('new-path', 'completed'), {
      recursive: true,
    });
    expect(mkdir).toHaveBeenCalledWith(join('new-path', 'failed'), {
      recursive: true,
    });
  });
});
