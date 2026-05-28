import { SubmissionType } from '@postybirb/types';
import {
  UserSpecifiedWebsiteOptions,
  type UserSpecifiedWebsiteOptionsRow,
} from './user-specified-website-options.entity';
import { Account } from './account.entity';
import { HydrationContext } from '../repositories/base/hydration-context';
import { assertRowRoundtrips } from '../repositories/base/test-utils';

function buildRow(
  overrides: Partial<UserSpecifiedWebsiteOptionsRow> = {},
): UserSpecifiedWebsiteOptionsRow {
  return {
    id: 'uswo-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    accountId: 'a-1',
    type: SubmissionType.FILE,
    options: { foo: 'bar' },
    ...overrides,
  };
}

describe('UserSpecifiedWebsiteOptions.fromRow', () => {
  it('round-trips scalar columns', () => {
    const row = buildRow();
    const entity = UserSpecifiedWebsiteOptions.fromRow(row);
    expect(entity).toBeInstanceOf(UserSpecifiedWebsiteOptions);
    assertRowRoundtrips(
      row,
      entity as unknown as Record<string, unknown> & { id: string },
      ['account'],
    );
  });

  it('hydrates account relation when present', () => {
    const row = buildRow({
      account: {
        id: 'a-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        name: 'acct',
        website: 'demo',
        groups: [],
      },
    });
    const entity = UserSpecifiedWebsiteOptions.fromRow(row);
    expect(entity.account).toBeInstanceOf(Account);
  });
});
