import { Entity, Property } from '@mikro-orm/core';
import { ISettings, ISettingsOptions } from '@postybirb/types';
import { BaseEntity } from './base.entity';

@Entity()
export class Settings extends BaseEntity<Settings> implements ISettings {
  @Property({ nullable: false })
  profile: string;

  @Property({ type: 'json', nullable: false })
  settings: ISettingsOptions;
}
