import {
  Entity,
  EntityRepositoryType,
  Property,
  serialize,
} from '@mikro-orm/core';
import { ISettings, SettingsDto, ISettingsOptions } from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class Settings extends PostyBirbEntity implements ISettings {
  [EntityRepositoryType]?: PostyBirbRepository<Settings>;

  @Property({ nullable: false })
  profile: string;

  @Property({ type: 'json', nullable: false })
  settings: ISettingsOptions;

  toJSON(): SettingsDto {
    return serialize(this) as SettingsDto;
  }
}
