import { Test, TestingModule } from '@nestjs/testing';
import { AccountLoginStateService } from './account-login-state.service';

describe('AccountLoginStateService', () => {
  let service: AccountLoginStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountLoginStateService],
    }).compile();

    service = module.get<AccountLoginStateService>(AccountLoginStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
