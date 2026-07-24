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
import { createTestRepository } from './test-utils';

/**
 * Integration spec for `EntityRepository` using `SubmissionRepository` as
 * the representative subclass. Covers: reads, writes, raw select, and
 * count.
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

  it('findByIdOrThrow(missing) throws EntityNotFoundError', async () => {
    await expect(
      repo.findByIdOrThrow('does-not-exist'),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it('findById(missing) returns null', async () => {
    expect(await repo.findById('does-not-exist')).toBeNull();
  });

  it('findAll applies defaultWith (eager-loads relations array)', async () => {
    const inserted = await repo.insert(buildInsert());
    const all = await repo.findAll();
    expect(all).toHaveLength(1);
    // `options` / `files` are defaultWith arrays; an empty
    // submission has empty arrays, but the keys MUST be present.
    expect(all[0]).toBeInstanceOf(Submission);
    expect(Array.isArray(all[0].options)).toBe(true);
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

  // --- count + select ---

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
