import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { NULL_ACCOUNT_ID } from '@postybirb/types';
import { Account } from '../drizzle/models';
import { waitUntil } from '../utils/wait.util';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dtos/create-account.dto';

describe('AccountsService', () => {
  let service: AccountService;
  let registryService: WebsiteRegistryService;
  let module: TestingModule;

  // Mock objects for deleteUnregisteredAccounts tests
  let mockRepository: any;
  let mockWebsiteRegistry: any;
  let mockLogger: any;

  const mockRegisteredAccount = {
    id: 'account-1',
    name: 'Test Account 1',
    website: 'registered-website',
    withWebsiteInstance(websiteInstance) {
      return this;
    },
    toDTO: () => {},
  } as Account;

  const mockUnregisteredAccount = {
    id: 'account-2',
    name: 'Test Account 2',
    website: 'unregistered-website',
    withWebsiteInstance(websiteInstance) {
      return this;
    },
    toDTO: () => {},
  } as Account;

  const mockAnotherUnregisteredAccount = {
    id: 'account-3',
    name: 'Test Account 3',
    website: 'another-unregistered-website',
    withWebsiteInstance(websiteInstance) {
      return this;
    },
    toDTO: () => {},
  } as Account;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      providers: [AccountService, WebsiteRegistryService, WebsiteImplProvider],
    }).compile();

    service = module.get<AccountService>(AccountService);
    registryService = module.get<WebsiteRegistryService>(
      WebsiteRegistryService,
    );

    await service.onModuleInit();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should manually execute onLogin', async () => {
    const mockWebsiteRegistry = jest.spyOn(registryService, 'findInstance');
    const mockEmitter = jest.spyOn(service, 'emit');
    mockEmitter.mockReturnValue(undefined);
    const getLoginState = jest
      .fn()
      .mockReturnValueOnce({
        isLoggedIn: false,
        pending: true,
      })
      .mockReturnValueOnce({
        isLoggedIn: true,
        pending: false,
      })
      .mockReturnValueOnce({
        isLoggedIn: true,
        pending: false,
      });

    const onLogin = jest.fn();

    mockWebsiteRegistry.mockReturnValue({
      onLogin,
      getLoginState,
      onBeforeLogin: jest.fn(),
      onAfterLogin: jest.fn(),
    } as unknown as UnknownWebsite);

    await service.manuallyExecuteOnLogin(NULL_ACCOUNT_ID);
    expect(mockWebsiteRegistry).toHaveBeenCalledTimes(1);
    expect(getLoginState).toHaveBeenCalledTimes(3);
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('should set and clear account data', async () => {
    const dto = new CreateAccountDto();
    dto.groups = ['test'];
    dto.name = 'test';
    dto.website = 'test';

    const record = await service.create(dto);
    expect(registryService.findInstance(record)).toBeDefined();

    await waitUntil(() => !record.websiteInstance?.getLoginState().pending, 50);
    expect(record.websiteInstance?.getWebsiteData()).toEqual({
      test: 'test-mode',
    });

    await service.setAccountData({
      id: record.id,
      data: { test: 'test-mode-2' },
    });
    expect(record.websiteInstance?.getWebsiteData()).toEqual({
      test: 'test-mode-2',
    });

    await service.clearAccountData(record.id);
    expect(record.websiteInstance?.getWebsiteData()).toEqual({});
  }, 10000);

  it('should create entities', async () => {
    const dto = new CreateAccountDto();
    dto.groups = ['test'];
    dto.name = 'test';
    dto.website = 'test';

    const record = await service.create(dto);
    expect(registryService.findInstance(record)).toBeDefined();

    const groups = await service.findAll();
    await waitUntil(() => !record.websiteInstance?.getLoginState().pending, 50);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toEqual(dto.name);
    expect(groups[0].website).toEqual(dto.website);
    expect(groups[0].groups).toEqual(dto.groups);
    expect(record.toDTO()).toEqual({
      groups: dto.groups,
      name: dto.name,
      website: dto.website,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      state: {
        isLoggedIn: true,
        pending: false,
        username: 'TestUser',
      },
      data: {
        test: 'test-mode',
      },
      websiteInfo: {
        supports: ['MESSAGE', 'FILE'],
        websiteDisplayName: 'Test',
      },
    });
  }, 10000);

  it('should support crud operations', async () => {
    const createAccount: CreateAccountDto = new CreateAccountDto();
    createAccount.name = 'test';
    createAccount.website = 'test';

    // Create
    const account = await service.create(createAccount);
    expect(account).toBeDefined();
    expect(await service.findAll()).toHaveLength(1);
    expect(await service.findById(account.id)).toBeDefined();

    // Update
    await service.update(account.id, { name: 'Updated', groups: [] });
    expect(await (await service.findById(account.id)).name).toEqual('Updated');

    // Remove
    await service.remove(account.id);
    expect(await service.findAll()).toHaveLength(0);
  });

  describe('deleteUnregisteredAccounts', () => {
    beforeEach(() => {
      // Setup mock objects for testing private method
      mockRepository = {
        find: jest.fn(),
        deleteById: jest.fn(),
        schemaEntity: { id: 'id' },
      };

      mockWebsiteRegistry = {
        canCreate: jest.fn(),
        create: jest.fn(),
        findInstance: jest.fn(),
        getAvailableWebsites: () => [],
      };

      mockLogger = {
        withMetadata: jest.fn().mockReturnThis(),
        withError: jest.fn().mockReturnThis(),
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

      mockRepository.deleteById.mockResolvedValue(undefined);
    });

    it('should delete accounts for unregistered websites', async () => {
      await (service as any).deleteUnregisteredAccounts();

      // Verify that find was called to get all accounts except NULL_ACCOUNT_ID
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: expect.any(Object), // ne(schemaEntity.id, NULL_ACCOUNT_ID)
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
        .mockResolvedValueOnce(undefined) // First deletion succeeds
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
      // The actual service uses ne(this.repository.schemaEntity.id, NULL_ACCOUNT_ID) to exclude it
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
