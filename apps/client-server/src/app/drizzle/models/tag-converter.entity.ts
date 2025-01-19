import { ITagConverter, TagConverterDto } from '@postybirb/types';
import { instanceToPlain, plainToClass } from 'class-transformer';
import { tagConverter } from '../schemas';
import { DatabaseEntity } from './database-entity';

export class TagConverter extends DatabaseEntity implements ITagConverter {
  public readonly tag: string;

  public convertTo: Record<string, string> = {};

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(entity: ITagConverter) {
    super(entity);
  }

  toObject(): ITagConverter {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ITagConverter;
  }

  toDTO(): TagConverterDto {
    return this.toObject() as unknown as TagConverterDto;
  }

  static fromDBO(entity: typeof tagConverter.$inferSelect): TagConverter {
    return plainToClass(TagConverter, entity, { enableCircularCheck: true });
  }
}
