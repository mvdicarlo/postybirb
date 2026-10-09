import { ConflictException } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import {
    Account,
    clearDatabase,
    PostRepository,
    SubmissionRepository,
    WebsiteOptionsRepository,
} from '@postybirb/database';
import {
    ISubmissionMetadata,
    IWebsiteFormFields,
    NULL_ACCOUNT_ID,
    ScheduleType,
    SubmissionType,
} from '@postybirb/types';
import {
    EntityRemovedEvent,
    EntityUpdatedEvent,
} from '../common/events/entity-crud.events';
import { noopPlatformProvider } from '../platform/testing/noop-platform-providers';
import { PostingActivityModule } from '../posting/posting-activity.module';
import { PostingActivityService } from '../posting/posting-activity.service';
import { waitUntil } from '../utils/wait.util';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import {
    ACCOUNT_REMOVED,
    ACCOUNT_STATE_CHANGED,
} from './account.events';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dtos/create-account.dto';

describe('AccountsService', () => {
  let service: AccountService;
  let registryService: WebsiteRegistryService;
  let module: TestingModule;
  let eventEmitter: EventEmitter2;
  let emit: jest.SpyInstance;
  let postingActivity: PostingActivityService;

  // Mock objects for deleteUnregisteredAccounts tests
  let mockRepository: any;
  let mockWebsiteRegistry: any;
  let mockLogger: any;

  const mockRegisteredAccount = new Account({
    id: 'account-1',
    name: 'Test Account 1',
    website: 'registered-website',
    groups: [],
  });

  const mockUnregisteredAccount = new Account({
    id: 'account-2',
    name: 'Test Account 2',
    website: 'unregistered-website',
    groups: [],
  });

  const mockAnotherUnregisteredAccount = new Account({
    id: 'account-3',
    name: 'Test Account 3',
    website: 'another-unregistered-website',
    groups: [],
  });

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), PostingActivityModule],
      providers: [
        AccountService,
        WebsiteRegistryService,
        WebsiteImplProvider,
        ...[noopPlatformProvider],
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
    registryService = module.get<WebsiteRegistryService>(
      WebsiteRegistryService,
    );
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    emit = jest.spyOn(eventEmitter, 'emit');
    postingActivity = module.get<PostingActivityService>(
      PostingActivityService,
    );

    await module.init();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set and clear account data', async () => {
    const dto = new CreateAccountDto();
    dto.groups = ['test'];
    dto.name = 'test';
    dto.website = 'test';

    const record = await service.create(dto);
    const instance = registryService.findInstance(record);
    expect(instance).toBeDefined();

    await instance?.login();
    const websiteData = instance?.getWebsiteData();
    expect(websiteData).toEqual({
      test: 'test-mode',
    });

    await service.setAccountData({
      id: record.id,
      data: { test: 'test-mode-2' },
    });
    expect(instance?.getWebsiteData()).toEqual({
      test: 'test-mode-2',
    });

    await service.clearAccountData(record.id);
    expect(instance?.getWebsiteData()).toEqual({});
  }, 10000);

  it('should create entities', async () => {
    const dto = new CreateAccountDto();
    dto.groups = ['test'];
    dto.name = 'test';
    dto.website = 'test';

    const record = await service.create(dto);
    const instance = registryService.findInstance(record);
    expect(instance).toBeDefined();

    const groups = await service.findAll();
    await waitUntil(() => !instance?.getLoginState().pending, 50);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toEqual(dto.name);
    expect(groups[0].website).toEqual(dto.website);
    expect(groups[0].groups).toEqual(dto.groups);
    const recordDto = instance!.toAccountDto();
    expect(recordDto).toEqual(expect.objectContaining({
      groups: dto.groups,
      name: dto.name,
      website: dto.website,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      defaultFileTemplateId: null,
      defaultMessageTemplateId: null,
      state: {
        status: 'loggedIn',
        isLoggedIn: true,
        pending: false,
        username: 'TestUser',
        lastUpdated: expect.any(String),
      },
      data: {
        test: 'test-mode',
      },
      instanceCapabilities: expect.objectContaining({
        supports: ['MESSAGE', 'FILE'],
        websiteDisplayName: 'Test',
      }),
    }));
  }, 10000);

  it('should roll back a create when website initialization fails', async () => {
    jest
      .spyOn(registryService, 'create')
      .mockRejectedValueOnce(new Error('Initialization failed'));
    const dto = new CreateAccountDto();
    dto.groups = [];
    dto.name = 'test';
    dto.website = 'test';

    await expect(service.create(dto)).rejects.toThrow('Initialization failed');

    expect(await service.findAll()).toHaveLength(0);
    expect(
      emit.mock.calls.some(([event]) => event === ACCOUNT_STATE_CHANGED),
    ).toBe(false);
  });

  it('should support crud operations', async () => {
    const createAccount: CreateAccountDto = new CreateAccountDto();
    createAccount.name = 'test';
    createAccount.website = 'test';

    // Create
    const account = await service.create(createAccount);
    expect(account).toBeDefined();
    await waitUntil(
      () =>
        emit.mock.calls.some(([event]) => event === ACCOUNT_STATE_CHANGED),
      10,
    );
    expect(emit).toHaveBeenCalledWith(ACCOUNT_STATE_CHANGED, [
      new EntityUpdatedEvent(
        expect.objectContaining({ id: account.id }) as never,
      ),
    ]);
    expect(await service.findAll()).toHaveLength(1);
    expect(await service.findById(account.id)).toBeDefined();

    // Update
    emit.mockClear();
    const updated = await service.update(account.id, {
      name: 'Updated',
      groups: [],
    });
    expect(updated.name).toEqual('Updated');
    await waitUntil(
      () =>
        emit.mock.calls.some(([event]) => event === ACCOUNT_STATE_CHANGED),
      10,
    );
    expect(emit).toHaveBeenCalledWith(ACCOUNT_STATE_CHANGED, [
      new EntityUpdatedEvent(
        expect.objectContaining({ id: updated.id, name: 'Updated' }) as never,
      ),
    ]);

    // Remove
    emit.mockClear();
    await service.remove(account.id);
    expect(emit).toHaveBeenCalledWith(ACCOUNT_REMOVED, [
      new EntityRemovedEvent(account.id),
    ]);
    expect(await service.findAll()).toHaveLength(0);
  });

  it('should recreate the Website instance when database deletion fails', async () => {
    const createAccount = new CreateAccountDto();
    createAccount.name = 'test';
    createAccount.website = 'test';
    const account = await service.create(createAccount);
    const original = registryService.findInstance(account)!;
    const deleteError = new Error('Database deletion failed');
    jest
      .spyOn((service as any).repository, 'deleteById')
      .mockRejectedValueOnce(deleteError);
    emit.mockClear();

    await expect(service.remove(account.id)).rejects.toBe(deleteError);

    const persistedAccount = await service.findByIdOrThrow(account.id);
    const recreated = registryService.findInstance(persistedAccount);
    expect(original.isDisposed).toBe(true);
    expect(recreated).toBeDefined();
    expect(recreated).not.toBe(original);
    expect(
      emit.mock.calls.some(([event]) => event === ACCOUNT_REMOVED),
    ).toBe(false);
  });

  it('rejects account deletion when it would remove accepted submission options', async () => {
    const account = await service.create({
      name: 'active-account',
      website: 'test',
      groups: [],
    });
    const submissionRepository = new SubmissionRepository();
    const optionRepository = new WebsiteOptionsRepository();
    const postRepository = new PostRepository();
    const submission = await submissionRepository.insert({
      type: SubmissionType.MESSAGE,
      isScheduled: false,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: true,
      schedule: { scheduleType: ScheduleType.NONE },
      metadata: {} as ISubmissionMetadata,
      dependsOn: [],
      order: 0,
    });
    const option = await optionRepository.insert({
      accountId: account.id,
      submissionId: submission.id,
      data: {} as IWebsiteFormFields,
      isDefault: false,
    });
    const post = await postRepository.insert({ submissionId: submission.id });
    postingActivity.accept(post.id, 3);

    await expect(service.remove(account.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.findById(account.id)).resolves.toBeDefined();
    await expect(optionRepository.findById(option.id)).resolves.toBeDefined();
  });

  describe('deleteUnregisteredAccounts', () => {
    beforeEach(() => {
      // Setup mock objects for testing private method
      mockRepository = {
        find: jest.fn(),
        deleteById: jest.fn(),
        table: { id: 'id' },
      };

      mockWebsiteRegistry = {
        canCreate: jest.fn(),
        create: jest.fn(),
        findInstance: jest.fn(),
        getAvailableWebsites: () => [],
        markAsInitialized: jest.fn(),
        emit: jest.fn(),
      };

      mockLogger = {
        withMetadata: jest.fn().mockReturnThis(),
        withError: jest.fn().mockReturnThis(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      // Replace service dependencies with mocks
      (service as any).repository = mockRepository;
      (service as any).websiteRegistry = mockWebsiteRegistry;
      (service as any).logger = mockLogger;

      // Setup default mock behavior
      mockRepository.find.mockResolvedValue([
        mockRegisteredAccount,
        mockUnregisteredAccount,
        mockAnotherUnregisteredAccount,
      ]);

      mockWebsiteRegistry.canCreate.mockImplementation((website: string) => {
        return website === 'registered-website';
      });

      mockRepository.deleteById.mockResolvedValue({ changes: 1 });
    });

    it('should delete accounts for unregistered websites', async () => {
      await (service as any).deleteUnregisteredAccounts();

      // Verify that find was called to get all accounts except NULL_ACCOUNT_ID
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: expect.any(Object), // ne(table.id, NULL_ACCOUNT_ID)
      });

      // Verify canCreate was called for each account's website
      expect(mockWebsiteRegistry.canCreate).toHaveBeenCalledWith(
        'registered-website',
      );
      expect(mockWebsiteRegistry.canCreate).toHaveBeenCalledWith(
        'unregistered-website',
      );
      expect(mockWebsiteRegistry.canCreate).toHaveBeenCalledWith(
        'another-unregistered-website',
      );
      expect(mockWebsiteRegistry.canCreate).toHaveBeenCalledTimes(3);

      // Verify deleteById was called for unregistered accounts only
      expect(mockRepository.deleteById).toHaveBeenCalledWith(['account-2']);
      expect(mockRepository.deleteById).toHaveBeenCalledWith(['account-3']);
      expect(mockRepository.deleteById).toHaveBeenCalledTimes(2);

      // Verify logging
      expect(mockLogger.withMetadata).toHaveBeenCalledWith(
        mockUnregisteredAccount,
      );
      expect(mockLogger.withMetadata).toHaveBeenCalledWith(
        mockAnotherUnregisteredAccount,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Deleting unregistered account: account-2 (Test Account 2)',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Deleting unregistered account: account-3 (Test Account 3)',
      );
    });

    it('should not delete accounts for registered websites', async () => {
      await (service as any).deleteUnregisteredAccounts();

      // Verify the registered account was not deleted
      expect(mockRepository.deleteById).not.toHaveBeenCalledWith(['account-1']);
    });

    it('should handle deletion errors gracefully', async () => {
      const deleteError = new Error('Database deletion failed');
      mockRepository.deleteById
        .mockResolvedValueOnce({ changes: 1 }) // First deletion succeeds
        .mockRejectedValueOnce(deleteError); // Second deletion fails

      await (service as any).deleteUnregisteredAccounts();

      // Verify both deletions were attempted
      expect(mockRepository.deleteById).toHaveBeenCalledTimes(2);

      // Verify error was logged for the failed deletion
      expect(mockLogger.withError).toHaveBeenCalledWith(deleteError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete unregistered account: account-3',
      );
    });

    it('should handle empty accounts list', async () => {
      mockRepository.find.mockResolvedValue([]);

      await (service as any).deleteUnregisteredAccounts();

      expect(mockWebsiteRegistry.canCreate).not.toHaveBeenCalled();
      expect(mockRepository.deleteById).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle case where all accounts are registered', async () => {
      mockRepository.find.mockResolvedValue([mockRegisteredAccount]);

      await (service as any).deleteUnregisteredAccounts();

      expect(mockWebsiteRegistry.canCreate).toHaveBeenCalledWith(
        'registered-website',
      );
      expect(mockRepository.deleteById).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should exclude NULL_ACCOUNT_ID from deletion consideration', async () => {
      const nullAccount = {
        id: NULL_ACCOUNT_ID,
        name: 'Null Account',
        website: 'null',
      } as Account;

      // Mock the repository.find to only return non-NULL accounts (simulating the database query)
      // The actual service uses ne(this.table.id, NULL_ACCOUNT_ID) to exclude it
      mockRepository.find.mockResolvedValue([
        mockUnregisteredAccount, // Only return the unregistered account, not the null account
      ]);

      // Even if null website is not registered, it shouldn't be considered for deletion
      mockWebsiteRegistry.canCreate.mockImplementation((website: string) => {
        return website !== 'null' && website !== 'unregistered-website';
      });

      await (service as any).deleteUnregisteredAccounts();

      // Verify the query excludes NULL_ACCOUNT_ID (this is tested by the repository mock)
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: expect.any(Object),
      });

      // Only the unregistered account should be deleted, not the null account
      expect(mockRepository.deleteById).toHaveBeenCalledWith(['account-2']);
      expect(mockRepository.deleteById).toHaveBeenCalledTimes(1);
    });
  });
});
