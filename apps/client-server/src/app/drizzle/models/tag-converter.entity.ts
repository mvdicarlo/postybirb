import { ITagConverter, TagConverterDto } from '@postybirb/types';
import { instanceToPlain } from 'class-transformer';
import { DatabaseEntity } from './database-entity';

export class TagConverter extends DatabaseEntity implements ITagConverter {
  public readonly tag: string;

  public convertTo: Record<string, string> = {};

  constructor(entity: ITagConverter) {
    super(entity);
    Object.assign(this, entity);
  }

  toObject(): ITagConverter {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as ITagConverter;
  }

  toDTO(): TagConverterDto {
    return this.toObject() as unknown as TagConverterDto;
  }
}
