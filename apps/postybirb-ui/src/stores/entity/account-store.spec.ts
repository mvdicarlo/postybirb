import { IAccountDto, SubmissionType } from '@postybirb/types';
import { AccountRecord } from '../records';
import { accountHasChanged } from './account-store';

jest.mock('../../api/account.api', () => ({
  __esModule: true,
  default: { getAll: jest.fn() },
}));

jest.mock('../../transports/websocket', () => ({
  __esModule: true,
  default: { on: jest.fn(), connected: false },
}));

const timestamp = '2026-07-22T00:00:00.000Z';

function createDto(overrides: Partial<IAccountDto> = {}): IAccountDto {
  return {
    id: 'account-id',
    createdAt: timestamp,
    updatedAt: timestamp,
    name: 'Account',
    website: 'test',
    groups: [],
    defaultFileTemplateId: null,
    defaultMessageTemplateId: null,
    state: {
      status: 'idle',
      isLoggedIn: false,
      pending: false,
      username: null,
      lastUpdated: null,
    },
    data: {},
    instanceCapabilities: {
      websiteDisplayName: '',
      supports: [],
    },
    ...overrides,
  };
}

describe('accountHasChanged', () => {
  it('detects deferred website projection changes', () => {
    const existing = new AccountRecord(createDto());
    const initialized = createDto({
      instanceCapabilities: {
        websiteDisplayName: 'Test Website',
        supports: [SubmissionType.FILE],
      },
    });

    expect(accountHasChanged(existing, initialized)).toBe(true);
  });
});