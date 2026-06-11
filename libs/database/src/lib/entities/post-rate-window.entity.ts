import type { IEntity, IEntityDto, IPostRateWindow } from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { PostRateWindowSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

export type PostRateWindowRow = InferSelectModel<typeof PostRateWindowSchema>;

type IPostRateWindowEntity = IEntity & IPostRateWindow;

export class PostRateWindow
  extends DatabaseEntity<IPostRateWindowEntity>
  implements IPostRateWindowEntity
{
  public readonly entitySchemaKey!: 'PostRateWindowSchema';

  public key: string;

  public lastPostedAt: string;

  constructor(init: Partial<IPostRateWindowEntity> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'PostRateWindowSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.key = init.key ?? '';
    this.lastPostedAt = init.lastPostedAt ?? new Date().toISOString();
  }

  public toObject(): IPostRateWindowEntity {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      key: this.key,
      lastPostedAt: this.lastPostedAt,
    };
  }

  public toDTO(): IEntityDto<IPostRateWindowEntity> {
    return this.toObject();
  }

  static fromRow(
    row: PostRateWindowRow,
    ctx: HydrationContext = new HydrationContext(),
  ): PostRateWindow {
    return ctx.hydrate('PostRateWindowSchema', row, PostRateWindow);
  }
}
