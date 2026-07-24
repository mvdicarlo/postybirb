import type { PostyBirbDatabaseType } from '../database';
import {
    TransactionContext,
    withTransactionContext,
} from './transaction-context';

/**
 * Build a chainable mock that satisfies the subset of the drizzle query
 * builder used by `TransactionContext.cleanup` (`db.delete(table).where(eq(...))`).
 * The returned promise resolves so cleanup completes without thenable
 * rejection. Per-call `where` mocks are returned so tests can assert that
 * cleanup ran.
 */
function makeMockDb() {
  const whereMock = jest.fn().mockResolvedValue(undefined);
  const deleteMock = jest.fn(() => ({ where: whereMock }));
  return {
    db: { delete: deleteMock } as unknown as PostyBirbDatabaseType,
    deleteMock,
    whereMock,
  };
}

describe('TransactionContext', () => {
  describe('commit()', () => {
    it('clears tracked entities so a later cleanup is a no-op', async () => {
      const { db, deleteMock } = makeMockDb();
      const ctx = new TransactionContext(db);
      ctx.track('AccountSchema', 'a1');
      ctx.track('SubmissionSchema', 's1');

      ctx.commit();
      await ctx.cleanup();

      expect(deleteMock).not.toHaveBeenCalled();
    });

    it('is safe to call when no entities are tracked', () => {
      const { db } = makeMockDb();
      const ctx = new TransactionContext(db);

      expect(() => ctx.commit()).not.toThrow();
    });
  });

  describe('cleanup()', () => {
    it('deletes tracked entities in LIFO order', async () => {
      const { db, deleteMock, whereMock } = makeMockDb();
      const ctx = new TransactionContext(db);
      ctx.track('AccountSchema', 'a1');
      ctx.track('SubmissionSchema', 's1');

      await ctx.cleanup();

      expect(deleteMock).toHaveBeenCalledTimes(2);
      expect(whereMock).toHaveBeenCalledTimes(2);
    });

    it('continues cleanup when a single delete throws', async () => {
      const whereMock = jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValue(undefined);
      const deleteMock = jest.fn(() => ({ where: whereMock }));
      const db = { delete: deleteMock } as unknown as PostyBirbDatabaseType;
      const ctx = new TransactionContext(db);
      ctx.track('AccountSchema', 'a1');
      ctx.track('SubmissionSchema', 's1');

      await expect(ctx.cleanup()).resolves.toBeUndefined();
      expect(deleteMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDb()', () => {
    it('returns the database instance passed to the constructor', () => {
      const { db } = makeMockDb();
      const ctx = new TransactionContext(db);
      expect(ctx.getDb()).toBe(db);
    });
  });

  describe('withTransactionContext()', () => {
    it('resolves with the operation return value and commits', async () => {
      const { db, deleteMock } = makeMockDb();

      const result = await withTransactionContext(db, async (ctx) => {
        ctx.track('AccountSchema', 'a1');
        return 'ok';
      });

      expect(result).toBe('ok');
      expect(deleteMock).not.toHaveBeenCalled();
    });

    it('runs cleanup and rethrows when the operation throws', async () => {
      const { db, deleteMock } = makeMockDb();
      const failure = new Error('op failed');

      await expect(
        withTransactionContext(db, async (ctx) => {
          ctx.track('AccountSchema', 'a1');
          ctx.track('SubmissionSchema', 's1');
          throw failure;
        }),
      ).rejects.toBe(failure);

      expect(deleteMock).toHaveBeenCalledTimes(2);
    });

    it('does not invoke cleanup when operation succeeds', async () => {
      const { db, deleteMock } = makeMockDb();

      await withTransactionContext(db, async () => 'ok');

      expect(deleteMock).not.toHaveBeenCalled();
    });
  });
});
