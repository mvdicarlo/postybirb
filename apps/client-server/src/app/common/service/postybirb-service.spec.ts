import {
  clearDatabase,
  EntityNotFoundError,
  TagConverterRepository,
} from '@postybirb/database';
import 'reflect-metadata';
import { PostyBirbService } from './postybirb-service';

/**
 * Phase E Step 24 — base service accepts only the lib-side
 * `EntityRepository`. The legacy `PostyBirbDatabase` wrapper, the
 * `adaptEntityRepository` shim, and the `string`-key constructor
 * overload are gone. `EntityNotFoundError` is now surfaced verbatim
 * (a global exception filter remaps it to a 404 at the HTTP boundary).
 *
 * @see docs/DRIZZLE_REPOSITORY_MIGRATION_IMPLEMENTATION.md
 */
class TagConvertersTestService extends PostyBirbService<'TagConverterSchema'> {
  constructor(repository: TagConverterRepository) {
    super(repository);
  }
}

describe('PostyBirbService', () => {
  let service: TagConvertersTestService;

  beforeEach(() => {
    clearDatabase();
    service = new TagConvertersTestService(new TagConverterRepository());
  });

  it('exposes the underlying drizzle table via the table accessor', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = (service as any).table;
    expect(table).toBeTruthy();
    expect(table.id).toBeTruthy();
  });

  it('supports insert/find/list/remove via the repository surface', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (service as any).repository.insert({
      tag: 'bar',
      convertTo: { ascii: 'baz' },
    });

    expect(created.id).toBeTruthy();

    const list = await service.findAll();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);

    const fetched = await service.findById(created.id);
    expect(fetched?.id).toBe(created.id);

    await service.remove(created.id);
    expect(await service.findAll()).toHaveLength(0);
  });

  it('returns void from remove() (no RunResult leaked through service)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (service as any).repository.insert({
      tag: 'bar',
      convertTo: { ascii: 'baz' },
    });
    const result = await service.remove(created.id);
    expect(result).toBeUndefined();
  });

  it('throws EntityNotFoundError for findById({failOnMissing}) on a missing id', async () => {
    await expect(
      service.findById('00000000-0000-0000-0000-000000000000', {
        failOnMissing: true,
      }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });
});
