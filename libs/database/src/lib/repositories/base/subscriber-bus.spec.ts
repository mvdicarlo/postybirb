import { SubscriberBus } from './subscriber-bus';
import type { Action, SubscriberCb } from './types';

describe('SubscriberBus', () => {
  afterEach(() => {
    SubscriberBus.clear();
  });

  describe('subscribe / unsubscribe / notifyImmediate', () => {
    it('fires synchronously with (ids, action, schemaKey)', () => {
      const cb = jest.fn();
      SubscriberBus.subscribe('AccountSchema', cb);
      SubscriberBus.notifyImmediate('AccountSchema', ['a', 'b'], 'insert');
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(['a', 'b'], 'insert', 'AccountSchema');
    });

    it('supports multi-key subscription', () => {
      const cb = jest.fn();
      SubscriberBus.subscribe(['AccountSchema', 'SubmissionSchema'], cb);
      SubscriberBus.notifyImmediate('AccountSchema', ['1'], 'insert');
      SubscriberBus.notifyImmediate('SubmissionSchema', ['2'], 'update');
      expect(cb).toHaveBeenNthCalledWith(1, ['1'], 'insert', 'AccountSchema');
      expect(cb).toHaveBeenNthCalledWith(
        2,
        ['2'],
        'update',
        'SubmissionSchema',
      );
    });

    it('does not interact with pending coalesced buckets', () => {
      const cb = jest.fn();
      SubscriberBus.subscribe('AccountSchema', cb);
      SubscriberBus.notify('AccountSchema', ['queued'], 'insert');
      SubscriberBus.notifyImmediate('AccountSchema', ['immediate'], 'insert');
      // The immediate fire should have happened first, synchronously.
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenLastCalledWith(
        ['immediate'],
        'insert',
        'AccountSchema',
      );
      // Drain pending — queued ids fire now.
      SubscriberBus.flush();
      expect(cb).toHaveBeenCalledTimes(2);
      expect(cb).toHaveBeenLastCalledWith(
        ['queued'],
        'insert',
        'AccountSchema',
      );
    });

    it('unsubscribe removes the callback', () => {
      const cb = jest.fn();
      SubscriberBus.subscribe('AccountSchema', cb);
      SubscriberBus.unsubscribe('AccountSchema', cb);
      SubscriberBus.notifyImmediate('AccountSchema', ['1'], 'insert');
      expect(cb).not.toHaveBeenCalled();
    });

    it('clear() removes all subscribers and pending notifications', () => {
      const cb = jest.fn();
      SubscriberBus.subscribe('AccountSchema', cb);
      SubscriberBus.notify('AccountSchema', ['1'], 'insert');
      SubscriberBus.clear();
      SubscriberBus.flush();
      SubscriberBus.notifyImmediate('AccountSchema', ['2'], 'insert');
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('coalescing', () => {
    it('collapses two notify calls for same (key, action) within a tick into one callback with id union', () => {
      const cb = jest.fn();
      SubscriberBus.subscribe('AccountSchema', cb);
      SubscriberBus.notify('AccountSchema', ['a', 'b'], 'insert');
      SubscriberBus.notify('AccountSchema', ['b', 'c'], 'insert');
      // Not yet fired — coalesced.
      expect(cb).not.toHaveBeenCalled();
      SubscriberBus.flush();
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(
        ['a', 'b', 'c'],
        'insert',
        'AccountSchema',
      );
    });

    it('different actions in the same tick fire in insert -> update -> delete order', () => {
      const seen: Array<[Action, ...string[]]> = [];
      const cb: SubscriberCb = (ids, action) => {
        seen.push([action, ...ids]);
      };
      SubscriberBus.subscribe('AccountSchema', cb);
      // Submit in deliberately scrambled order; drain order is fixed.
      SubscriberBus.notify('AccountSchema', ['d'], 'delete');
      SubscriberBus.notify('AccountSchema', ['u'], 'update');
      SubscriberBus.notify('AccountSchema', ['i'], 'insert');
      SubscriberBus.flush();
      expect(seen).toEqual([
        ['insert', 'i'],
        ['update', 'u'],
        ['delete', 'd'],
      ]);
    });

    it('drains automatically on next microtask without flush()', async () => {
      const cb = jest.fn();
      SubscriberBus.subscribe('AccountSchema', cb);
      SubscriberBus.notify('AccountSchema', ['1'], 'insert');
      expect(cb).not.toHaveBeenCalled();
      // Yield to the microtask queue.
      await Promise.resolve();
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(['1'], 'insert', 'AccountSchema');
    });

    it('notify with empty ids is a no-op', () => {
      const cb = jest.fn();
      SubscriberBus.subscribe('AccountSchema', cb);
      SubscriberBus.notify('AccountSchema', [], 'insert');
      SubscriberBus.flush();
      expect(cb).not.toHaveBeenCalled();
    });

    it('a throwing subscriber does not abort the remaining subscribers in the bucket', () => {
      const good = jest.fn();
      const bad = jest.fn(() => {
        throw new Error('subscriber blew up');
      });
      SubscriberBus.subscribe('AccountSchema', bad);
      SubscriberBus.subscribe('AccountSchema', good);
      SubscriberBus.notify('AccountSchema', ['1'], 'insert');
      expect(() => SubscriberBus.flush()).not.toThrow();
      expect(bad).toHaveBeenCalledTimes(1);
      expect(good).toHaveBeenCalledTimes(1);
    });

    it('re-entrant notify from inside a subscriber schedules a fresh microtask, not appending to the draining bucket', async () => {
      const calls: string[][] = [];
      const cb = jest.fn((ids: string[]) => {
        calls.push([...ids]);
        if (calls.length === 1) {
          // Re-enter. Must NOT join the current drain.
          SubscriberBus.notify('AccountSchema', ['re-entered'], 'insert');
        }
      });
      SubscriberBus.subscribe('AccountSchema', cb);
      SubscriberBus.notify('AccountSchema', ['first'], 'insert');
      SubscriberBus.flush();
      // Only the first invocation has fired so far.
      expect(calls).toEqual([['first']]);
      // The re-entrant notify fires on the next microtask.
      await Promise.resolve();
      expect(calls).toEqual([['first'], ['re-entered']]);
    });

    it('flush is a synchronous no-op when nothing is pending', () => {
      expect(() => SubscriberBus.flush()).not.toThrow();
    });
  });
});
