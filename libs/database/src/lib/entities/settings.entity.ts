import type {
    ISettings,
    ISettingsOptions,
    SettingsDto,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { SettingsSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';

export type SettingsRow = InferSelectModel<typeof SettingsSchema>;

export class Settings extends DatabaseEntity<ISettings> implements ISettings {
  public readonly entitySchemaKey!: 'SettingsSchema';

  public profile: string;

  public settings: ISettingsOptions;

  constructor(init: Partial<ISettings> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'SettingsSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.profile = init.profile ?? '';
    this.settings = init.settings ?? ({} as ISettingsOptions);
  }

  public toObject(): ISettings {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      profile: this.profile,
      settings: this.settings,
    };
  }

  public toDTO(): SettingsDto {
    return this.toObject();
  }

  static fromRow(
    row: SettingsRow,
    ctx: HydrationContext = new HydrationContext(),
  ): Settings {
    return ctx.hydrate('SettingsSchema', row, Settings);
  }
}
