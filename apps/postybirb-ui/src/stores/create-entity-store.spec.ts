import type { EntityDelta } from '@postybirb/types';
import AppSocket from '../transports/websocket';
import { BaseRecord } from './records/base-record';

jest.mock('../transports/websocket', () => ({
  __esModule: true,
  default: {
    on: jest.fn(),
    connected: false,
  },
}));

import { applyEntityDelta, createEntityStore } from './create-entity-store';

const mockSocketOn = AppSocket.on as jest.Mock;

interface TestDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

class TestRecord extends BaseRecord {
  readonly name: string;

  constructor(dto: TestDto) {
    super(dto);
    this.name = dto.name;
  }
}

const timestamp = '2026-07-22T00:00:00.000Z';

function dto(id: string, name = id, updatedAt = timestamp): TestDto {
  return { id, name, createdAt: timestamp, updatedAt };
}

function records(...dtos: TestDto[]) {
  const values = dtos.map((value) => new TestRecord(value));
  return {
    values,
    map: new Map(values.map((value) => [value.id, value])),
  };
}

describe('applyEntityDelta', () => {
  it('updates in place, appends new records, and removes IDs atomically', () => {
    const existing = records(dto('a'), dto('b'), dto('c'));
    const delta: EntityDelta<TestDto> = {
      upserts: [
        dto('b', 'updated', '2026-07-22T00:01:00.000Z'),
        dto('d'),
      ],
      removedIds: ['a'],
    };

    const result = applyEntityDelta(
      existing.values,
      existing.map,
      delta,
      (value) => new TestRecord(value),
    );

    expect(result?.records.map((record) => record.id)).toEqual([
      'b',
      'c',
      'd',
    ]);
    expect(result?.records[0].name).toBe('updated');
    expect(result?.records[1]).toBe(existing.values[2]);
    expect(result?.recordsMap.get('d')).toBe(result?.records[2]);
  });

  it('returns null for unchanged upserts and unknown removals', () => {
    const existing = records(dto('a'));

    const result = applyEntityDelta(
      existing.values,
      existing.map,
      { upserts: [dto('a')], removedIds: ['missing'] },
      (value) => new TestRecord(value),
    );

    expect(result).toBeNull();
  });

  it('uses the custom change comparator', () => {
    const existing = records(dto('a'));

    const result = applyEntityDelta(
      existing.values,
      existing.map,
      { upserts: [dto('a', 'updated')], removedIds: [] },
      (value) => new TestRecord(value),
      (record, incoming) => record.name !== incoming.name,
    );

    expect(result?.records[0].name).toBe('updated');
  });

  it('uses the last duplicate upsert for a new entity', () => {
    const existing = records();

    const result = applyEntityDelta(
      existing.values,
      existing.map,
      {
        upserts: [
          dto('a', 'first'),
          dto('a', 'last', '2026-07-22T00:01:00.000Z'),
        ],
        removedIds: [],
      },
      (value) => new TestRecord(value),
    );

    expect(result?.records).toHaveLength(1);
    expect(result?.records[0].name).toBe('last');
  });
});

describe('createEntityStore delta events', () => {
  beforeEach(() => {
    mockSocketOn.mockClear();
  });

  it('applies socket deltas and reloads after a socket reconnect', async () => {
    const fetchFn = jest.fn().mockResolvedValue([dto('snapshot')]);
    const store = createEntityStore(
      fetchFn,
      (value: TestDto) => new TestRecord(value),
      {
        storeName: 'TestStore',
        websocketDeltaEvent: 'TEST_DELTA',
      },
    );

    const deltaHandler = mockSocketOn.mock.calls.find(
      ([event]) => event === 'TEST_DELTA',
    )?.[1];
    deltaHandler?.({
      upserts: [dto('live')],
      removedIds: [],
    });
    expect(store.getState().records.map((record) => record.id)).toEqual([
      'live',
    ]);

    const connectHandler = mockSocketOn.mock.calls.find(
      ([event]) => event === 'connect',
    )?.[1];
    connectHandler?.();
    expect(fetchFn).not.toHaveBeenCalled();

    connectHandler?.();
    await fetchFn.mock.results[0].value;
    await Promise.resolve();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(store.getState().records.map((record) => record.id)).toEqual([
      'snapshot',
    ]);
  });

  it('replays deltas received while a snapshot is loading', async () => {
    let resolveFetch: (dtos: TestDto[]) => void;
    const fetchFn = jest.fn(
      () =>
        new Promise<TestDto[]>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const store = createEntityStore(
      fetchFn,
      (value: TestDto) => new TestRecord(value),
      {
        storeName: 'TestStore',
        websocketDeltaEvent: 'TEST_DELTA',
      },
    );
    const loadPromise = store.getState().loadAll();
    const deltaHandler = mockSocketOn.mock.calls.find(
      ([event]) => event === 'TEST_DELTA',
    )?.[1];

    deltaHandler?.({
      upserts: [dto('live')],
      removedIds: [],
    });
    resolveFetch!([dto('snapshot')]);
    await loadPromise;

    expect(store.getState().records.map((record) => record.id)).toEqual([
      'snapshot',
      'live',
    ]);
  });
});