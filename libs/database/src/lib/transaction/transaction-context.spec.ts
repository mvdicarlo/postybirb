import type { PostyBirbDatabaseType } from '../database';
import { SubscriberBus } from '../repositories/base/subscriber-bus';
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
  let notifyImmediateSpy: jest.SpyInstance;

  beforeEach(() => {
    notifyImmediateSpy = jest
      .spyOn(SubscriberBus, 'notifyImmediate')
      .mockImplementation(() => {
        /* swallow — verified via spy */
      });
  });

  afterEach(() => {
    notifyImmediateSpy.mockRestore();
    SubscriberBus.clear();
  });

  describe('commit()', () => {
    it('issues one notifyImmediate per schemaKey with union of tracked ids', () => {
      const { db } = makeMockDb();
      const ctx = new TransactionContext(db);
      ctx.track('AccountSchema', 'a1');
      ctx.track('AccountSchema', 'a2');
      ctx.track('SubmissionSchema', 's1');

      ctx.commit();

      expect(notifyImmediateSpy).toHaveBeenCalledTimes(2);
      expect(notifyImmediateSpy).toHaveBeenCalledWith(
        'AccountSchema',
        ['a1', 'a2'],
        'insert',
      );
      expect(notifyImmediateSpy).toHaveBeenCalledWith(
        'SubmissionSchema',
        ['s1'],
        'insert',
      );
    });

    it('trackMany behaves like multiple track calls', () => {
      const { db } = makeMockDb();
      const ctx = new TransactionContext(db);
      ctx.trackMany('AccountSchema', ['a1', 'a2', 'a3']);

      ctx.commit();

      expect(notifyImmediateSpy).toHaveBeenCalledTimes(1);
      expect(notifyImmediateSpy).toHaveBeenCalledWith(
        'AccountSchema',
        ['a1', 'a2', 'a3'],
        'insert',
      );
    });

    it('clears tracked entities so a second commit is a no-op', () => {
      const { db } = makeMockDb();
      const ctx = new TransactionContext(db);
      ctx.track('AccountSchema', 'a1');

      ctx.commit();
      ctx.commit();

      expect(notifyImmediateSpy).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no entities are tracked', () => {
      const { db } = makeMockDb();
      const ctx = new TransactionContext(db);

      ctx.commit();

      expect(notifyImmediateSpy).not.toHaveBeenCalled();
    });
  });

  describe('cleanup()', () => {
    it('deletes tracked entities in LIFO order and does NOT notify', async () => {
      const { db, deleteMock, whereMock } = makeMockDb();
      const ctx = new TransactionContext(db);
      ctx.track('AccountSchema', 'a1');
      ctx.track('SubmissionSchema', 's1');

      await ctx.cleanup();

      expect(deleteMock).toHaveBeenCalledTimes(2);
      expect(whereMock).toHaveBeenCalledTimes(2);
      expect(notifyImmediateSpy).not.toHaveBeenCalled();
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
      const { db } = makeMockDb();

      const result = await withTransactionContext(db, async (ctx) => {
        ctx.track('AccountSchema', 'a1');
        return 'ok';
      });

      expect(result).toBe('ok');
      expect(notifyImmediateSpy).toHaveBeenCalledWith(
        'AccountSchema',
        ['a1'],
        'insert',
      );
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
      expect(notifyImmediateSpy).not.toHaveBeenCalled();
    });

    it('does not invoke cleanup when operation succeeds', async () => {
      const { db, deleteMock } = makeMockDb();

      await withTransactionContext(db, async () => 'ok');

      expect(deleteMock).not.toHaveBeenCalled();
    });
  });
});
