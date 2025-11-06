import { IUserConverter, UserConverterDto } from '@postybirb/types';
import { instanceToPlain } from 'class-transformer';
import { DatabaseEntity } from './database-entity';

export class UserConverter extends DatabaseEntity implements IUserConverter {
  public readonly username: string;

  public convertTo: Record<string, string> = {};

  constructor(entity: IUserConverter) {
    super(entity);
    Object.assign(this, entity);
  }

  toObject(): IUserConverter {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IUserConverter;
  }

  toDTO(): UserConverterDto {
    return this.toObject() as unknown as UserConverterDto;
  }
}
