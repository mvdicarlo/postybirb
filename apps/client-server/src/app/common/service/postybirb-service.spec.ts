import { clearDatabase, TagConverterRepository } from '@postybirb/database';
import { NotFoundException } from '@nestjs/common';
import 'reflect-metadata';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { PostyBirbService } from './postybirb-service';

/**
 * Phase D Step 17 — base service accepts both the legacy
 * `PostyBirbDatabase` wrapper and the lib-side `EntityRepository`.
 * These tests exercise both branches against the same surface.
 *
 * @see docs/DRIZZLE_REPOSITORY_MIGRATION_IMPLEMENTATION.md
 */

class TagConvertersTestService extends PostyBirbService<'TagConverterSchema'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(source: any) {
    super(source);
  }
}

describe('PostyBirbService', () => {
  beforeEach(() => {
    clearDatabase();
  });

  describe.each<[string, () => PostyBirbService<'TagConverterSchema'>]>([
    [
      'schema key string (constructs legacy wrapper)',
      () => new TagConvertersTestService('TagConverterSchema'),
    ],
    [
      'legacy PostyBirbDatabase instance',
      () =>
        new TagConvertersTestService(
          new PostyBirbDatabase('TagConverterSchema'),
        ),
    ],
    [
      'lib EntityRepository instance',
      () => new TagConvertersTestService(new TagConverterRepository()),
    ],
  ])('with %s', (_label, build) => {
    let service: PostyBirbService<'TagConverterSchema'>;

    beforeEach(() => {
      service = build();
    });

    it('exposes the underlying drizzle table via the schema accessor', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const schema = (service as any).schema;
      expect(schema).toBeTruthy();
      expect(schema.id).toBeTruthy();
    });

    it('supports the legacy wrapper surface (insert/find/list/remove)', async () => {
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

    it('throws NotFoundException for findById({failOnMissing}) on a missing id', async () => {
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).repository.findById('00000000-0000-0000-0000-000000000000', {
          failOnMissing: true,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
