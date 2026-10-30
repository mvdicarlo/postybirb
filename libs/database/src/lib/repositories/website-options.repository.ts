import {
  DefaultDescriptionValue,
  EntityId,
  IWebsiteFormFields,
  UpdateWebsiteDescriptionDto,
} from '@postybirb/types';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../database';
import { WebsiteOptions } from '../entities/website-options.entity';
import { WebsiteOptionsSchema } from '../schemas';
import { EntityRepository } from './base/entity-repository';
import { EntityNotFoundError } from './base/entity-not-found.error';

/**
 * Default eager-load mirrors `WebsiteOptionsService` which always reads
 * account + submission alongside the options row.
 */
export class WebsiteOptionsRepository extends EntityRepository<
  'WebsiteOptionsSchema',
  WebsiteOptions
> {
  constructor() {
    super({
      schemaKey: 'WebsiteOptionsSchema',
      table: WebsiteOptionsSchema,
      query: getDatabase().query.WebsiteOptionsSchema,
      EntityClass: WebsiteOptions,
      defaultWith: { account: true, submission: true },
    });
  }

  /**
   * Other fields retain their existing writes. Only the nested description is
   * preserved, conditionally saved, or explicitly replaced inside the transaction.
   */
  public async updateData(
    id: EntityId,
    data: IWebsiteFormFields,
    descriptionUpdate?: 'replace' | UpdateWebsiteDescriptionDto,
    merge = false,
  ): Promise<WebsiteOptions | null> {
    const row = this.db.transaction((tx) => {
      const current = tx
        .select()
        .from(WebsiteOptionsSchema)
        .where(eq(WebsiteOptionsSchema.id, id))
        .get();
      if (!current) throw new EntityNotFoundError('WebsiteOptionsSchema', id);

      const previous = current.data.description?.version;
      const revision = previous?.revision ?? 0;
      if (
        descriptionUpdate &&
        descriptionUpdate !== 'replace' &&
        descriptionUpdate.expectedRevision !== revision
      ) {
        return null;
      }

      let { description } = current.data;
      if (
        descriptionUpdate &&
        (!merge || data.description !== undefined)
      ) {
        description = {
          ...(data.description ?? DefaultDescriptionValue()),
          version: {
            revision: revision + 1,
            mutationId:
              descriptionUpdate === 'replace'
                ? null
                : descriptionUpdate.mutationId,
            replacementRevision:
              descriptionUpdate === 'replace'
                ? revision + 1
                : previous?.replacementRevision ?? 0,
          },
        };
      }
      return tx
        .update(WebsiteOptionsSchema)
        .set({
          data: {
            ...(merge ? current.data : {}),
            ...data,
            description,
          },
        })
        .where(eq(WebsiteOptionsSchema.id, id))
        .returning()
        .get();
    });
    if (!row) return null;
    return Object.assign(await this.findByIdOrThrow(id), row);
  }
}
