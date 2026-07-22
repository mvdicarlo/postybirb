jest.mock('../transports/websocket', () => {
  const listenersByEvent = new Map<
    string,
    Array<(payload?: unknown) => void>
  >();
  const mockedSocket = {
    connected: false,
    on: jest.fn((event: string, listener: (payload?: unknown) => void) => {
      const listeners = listenersByEvent.get(event) ?? [];
      listeners.push(listener);
      listenersByEvent.set(event, listeners);
    }),
    emitTest(event: string, payload?: unknown) {
      for (const listener of listenersByEvent.get(event) ?? []) {
        listener(payload);
      }
    },
    reset() {
      listenersByEvent.clear();
      mockedSocket.connected = false;
      mockedSocket.on.mockClear();
    },
  };

  return { __esModule: true, default: mockedSocket };
});

import AppSocket from '../transports/websocket';
import { createEntityStore } from './create-entity-store';
import { BaseRecord } from './records/base-record';

interface TestDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  value: string;
}

class TestRecord extends BaseRecord {
  readonly value: string;

  constructor(dto: TestDto) {
    super(dto);
    this.value = dto.value;
  }
}

interface MockSocket {
  connected: boolean;
  on: jest.Mock;
  emitTest: (event: string, payload?: unknown) => void;
  reset: () => void;
}

const socket = AppSocket as unknown as MockSocket;

function dto(id: string, value: string, revision = 0): TestDto {
  return {
    id,
    value,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: `2026-01-01T00:00:0${revision}.000Z`,
  };
}

describe('createEntityStore delta handling', () => {
  beforeEach(() => {
    socket.reset();
  });

  it('loads an authoritative snapshot', async () => {
    const store = createEntityStore(
      async () => [dto('first', 'one')],
      (item) => new TestRecord(item),
      { storeName: 'TestStore' },
    );

    await store.getState().loadAll();

    expect(store.getState().records.map((record) => record.id)).toEqual([
      'first',
    ]);
    expect(store.getState().loadingState).toBe('loaded');
  });

  it('upserts and removes records while preserving order and references', async () => {
    const store = createEntityStore(
      async () => [dto('first', 'one'), dto('second', 'two')],
      (item) => new TestRecord(item),
      {
        storeName: 'TestStore',
        websocketDeltaEvent: 'TEST_DELTA',
      },
    );
    await store.getState().loadAll();
    const firstReference = store.getState().recordsMap.get('first');

    socket.emitTest('TEST_DELTA', {
      upserts: [dto('second', 'updated', 1), dto('third', 'three', 1)],
      removals: [],
    });

    expect(store.getState().records.map((record) => record.id)).toEqual([
      'first',
      'second',
      'third',
    ]);
    expect(store.getState().recordsMap.get('first')).toBe(firstReference);
    expect(store.getState().recordsMap.get('second')?.value).toBe('updated');

    socket.emitTest('TEST_DELTA', { upserts: [], removals: ['second'] });
    expect(store.getState().records.map((record) => record.id)).toEqual([
      'first',
      'third',
    ]);
  });

  it('skips no-op upserts using the custom comparator', async () => {
    const store = createEntityStore(
      async () => [dto('first', 'one')],
      (item) => new TestRecord(item),
      {
        storeName: 'TestStore',
        websocketDeltaEvent: 'TEST_DELTA',
        hasChanged: (existing, incoming) =>
          existing.value !== incoming.value,
      },
    );
    await store.getState().loadAll();
    const state = store.getState();

    socket.emitTest('TEST_DELTA', {
      upserts: [dto('first', 'one', 1)],
      removals: [],
    });

    expect(store.getState()).toBe(state);
  });

  it('replays deltas received while a snapshot is loading', async () => {
    let finishLoad: (items: TestDto[]) => void = () => undefined;
    const store = createEntityStore(
      () =>
        new Promise<TestDto[]>((resolve) => {
          finishLoad = resolve;
        }),
      (item) => new TestRecord(item),
      {
        storeName: 'TestStore',
        websocketDeltaEvent: 'TEST_DELTA',
      },
    );

    const load = store.getState().loadAll();
    socket.emitTest('TEST_DELTA', {
      upserts: [dto('first', 'new', 1), dto('second', 'two', 1)],
      removals: [],
    });
    socket.emitTest('TEST_DELTA', {
      upserts: [dto('first', 'newest', 2)],
      removals: ['second'],
    });
    finishLoad([dto('first', 'snapshot')]);
    await load;

    expect(store.getState().records).toHaveLength(1);
    expect(store.getState().records[0].value).toBe('newest');
  });

  it('applies buffered deltas when snapshot recovery fails', async () => {
    let failReload: (error: Error) => void = () => undefined;
    const fetch = jest
      .fn<Promise<TestDto[]>, []>()
      .mockResolvedValueOnce([dto('first', 'initial')])
      .mockImplementationOnce(
        () =>
          new Promise<TestDto[]>((_resolve, reject) => {
            failReload = reject;
          }),
      );
    const store = createEntityStore(fetch, (item) => new TestRecord(item), {
      storeName: 'TestStore',
      websocketDeltaEvent: 'TEST_DELTA',
    });
    await store.getState().loadAll();

    const reload = store.getState().loadAll();
    socket.emitTest('TEST_DELTA', {
      upserts: [dto('first', 'delta', 1)],
      removals: [],
    });
    failReload(new Error('offline'));
    await reload;

    expect(store.getState().records[0].value).toBe('delta');
    expect(store.getState().loadingState).toBe('error');
  });

  it('reloads the snapshot after reconnecting', async () => {
    const fetch = jest.fn(async () => [dto('first', 'one')]);
    const store = createEntityStore(fetch, (item) => new TestRecord(item), {
      storeName: 'TestStore',
      reloadOnReconnect: true,
    });
    await store.getState().loadAll();

    socket.emitTest('connect');
    expect(fetch).toHaveBeenCalledTimes(1);

    socket.emitTest('connect');
    await Promise.resolve();
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});