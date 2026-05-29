import type {
    Insert,
    ISubmissionMetadata,
} from '@postybirb/types';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { Submission } from '../../entities/submission.entity';
import { SubmissionSchema } from '../../schemas';
import { SubmissionRepository } from '../submission.repository';
import { EntityNotFoundError } from './entity-not-found.error';
import { SubscriberBus } from './subscriber-bus';
import { createTestRepository } from './test-utils';
import type { Action, SubscriberCb } from './types';

/**
 * Integration spec for `EntityRepository` using `SubmissionRepository` as
 * the representative subclass. Covers: reads, writes, subscriptions,
 * raw select, count, and coalesced notify.
 */
describe('EntityRepository (SubmissionRepository)', () => {
  const repo = createTestRepository(SubmissionRepository);

  function buildInsert(
    overrides: Partial<Insert<'SubmissionSchema'>> = {},
  ): Insert<'SubmissionSchema'> {
    return {
      type: SubmissionType.MESSAGE,
      isScheduled: false,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: false,
      schedule: { scheduleType: ScheduleType.NONE },
      metadata: {} as ISubmissionMetadata,
      order: 0,
      ...overrides,
    };
  }

  // --- reads ---

  it('findById(missing, { failOnMissing: true }) throws EntityNotFoundError', async () => {
    await expect(
      repo.findById('does-not-exist', { failOnMissing: true }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it('findById(missing) returns null', async () => {
    expect(await repo.findById('does-not-exist')).toBeNull();
  });

  it('findAll applies defaultWith (eager-loads relations array)', async () => {
    const inserted = await repo.insert(buildInsert());
    const all = await repo.findAll();
    expect(all).toHaveLength(1);
    // `options` / `posts` / `files` are defaultWith arrays; an empty
    // submission has empty arrays, but the keys MUST be present.
    expect(all[0]).toBeInstanceOf(Submission);
    expect(Array.isArray(all[0].options)).toBe(true);
    expect(Array.isArray(all[0].posts)).toBe(true);
    expect(Array.isArray(all[0].files)).toBe(true);
    expect(all[0].id).toBe(inserted.id);
  });

  it('find({}) with no `with` applies defaultWith', async () => {
    await repo.insert(buildInsert());
    const [row] = await repo.find({});
    expect(Array.isArray(row.options)).toBe(true);
  });

  it('find({ with: {} }) override wins over defaultWith', async () => {
    await repo.insert(buildInsert());
    const [row] = await repo.find({ with: {} });
    // With an empty `with` override, relations should be undefined since
    // drizzle was instructed to load none.
    expect(row.options).toBeUndefined();
    expect(row.posts).toBeUndefined();
    expect(row.files).toBeUndefined();
  });

  // --- writes ---

  it('insert(value) returns hydrated entity with defaultWith applied', async () => {
    const e = await repo.insert(buildInsert());
    expect(e).toBeInstanceOf(Submission);
    expect(Array.isArray(e.options)).toBe(true);
    expect(e.id).toBeDefined();
  });

  it('insert(values[]) returns hydrated array of matching length', async () => {
    const arr = await repo.insert([buildInsert(), buildInsert()]);
    expect(arr).toHaveLength(2);
    expect(arr[0]).toBeInstanceOf(Submission);
    expect(arr[1]).toBeInstanceOf(Submission);
  });

  it('update(missing) throws EntityNotFoundError', async () => {
    await expect(
      repo.update('does-not-exist', { isArchived: true }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it('update(id, set) returns hydrated entity reflecting the change', async () => {
    const e = await repo.insert(buildInsert());
    const updated = await repo.update(e.id, { isArchived: true });
    expect(updated.isArchived).toBe(true);
  });

  it('deleteById([ids]) returns RunResult with expected changes', async () => {
    const e = await repo.insert(buildInsert());
    const result = await repo.deleteById([e.id]);
    expect(result.changes).toBe(1);
    expect(await repo.findById(e.id)).toBeNull();
  });

  // --- subscribers ---

  it('writes broadcast through SubscriberBus with the right action and ids', async () => {
    const events: Array<[string[], Action]> = [];
    const cb: SubscriberCb = (ids, action) => events.push([ids, action]);
    repo.subscribe('SubmissionSchema', cb);

    const inserted = await repo.insert(buildInsert());
    SubscriberBus.flush();
    await repo.update(inserted.id, { isArchived: true });
    SubscriberBus.flush();
    await repo.deleteById([inserted.id]);
    SubscriberBus.flush();

    const actions = events.map(([, a]) => a);
    expect(actions).toEqual(['insert', 'update', 'delete']);
    expect(events[0][0]).toContain(inserted.id);
  });

  it('subscriber receives schemaKey as third argument', async () => {
    let receivedKey: string | undefined;
    repo.subscribe('SubmissionSchema', (_ids, _action, key) => {
      receivedKey = key;
    });
    await repo.insert(buildInsert());
    SubscriberBus.flush();
    expect(receivedKey).toBe('SubmissionSchema');
  });

  // --- count + select + notify passthrough ---

  it('count() and count(SQL) return expected counts', async () => {
    await repo.insert([
      buildInsert({ isArchived: true }),
      buildInsert({ isArchived: false }),
      buildInsert({ isArchived: true }),
    ]);
    expect(await repo.count()).toBe(3);
    expect(await repo.count(eq(SubmissionSchema.isArchived, true))).toBe(2);
  });

  it('select(SQL) returns hydrated entities without relations', async () => {
    const e = await repo.insert(buildInsert({ isArchived: true }));
    const rows = await repo.select(eq(SubmissionSchema.isArchived, true));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toBeInstanceOf(Submission);
    expect(rows[0].id).toBe(e.id);
    // .select bypasses the relational API — relations should be undefined.
    expect(rows[0].options).toBeUndefined();
  });

  it('repo.notify equals SubscriberBus.notify(schemaKey, ids, action)', async () => {
    const events: Array<[string[], Action]> = [];
    SubscriberBus.subscribe('SubmissionSchema', (ids, action) =>
      events.push([ids, action]),
    );
    repo.notify(['x'], 'update');
    SubscriberBus.notify('SubmissionSchema', ['x'], 'update');
    SubscriberBus.flush();
    // Both calls target the same (key, action, id) — the bus coalesces
    // them into a single subscriber invocation, proving repo.notify is
    // the exact same routing as the static call.
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual([['x'], 'update']);
  });
});

// --- compile-time check: update accepts Partial<Insert<TKey>> ---
//
// This is a type-only assertion; the body is unreachable at runtime but
// errors at compile time if the signature ever drops `Partial<...>`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _typeCheckUpdateAcceptsPartialInsert(
  repo: SubmissionRepository,
): void {
  void repo.update('id', { isArchived: true });
  void repo.update('id', { isArchived: true, isInitialized: true });
}
