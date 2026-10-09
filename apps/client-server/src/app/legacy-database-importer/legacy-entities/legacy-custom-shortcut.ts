import { Description, ICustomShortcut } from '@postybirb/types';
import { LegacyDescriptionConverter } from '../utils/legacy-description-converter';
import {
    LegacyConverterEntity,
    MinimalEntity,
} from './legacy-converter-entity';

export class LegacyCustomShortcut implements LegacyConverterEntity<ICustomShortcut> {
  _id: string;

  created: string;

  lastUpdated: string;

  shortcut: string;

  content: string;

  isDynamic: boolean;

  constructor(data: Partial<LegacyCustomShortcut>) {
    Object.assign(this, data);
  }

  async convert(): Promise<MinimalEntity<ICustomShortcut>> {
    // Convert legacy format to new format
    // Legacy: { shortcut: string, content: string, isDynamic: boolean }
    // New: { name: string, shortcut: Description (TipTap format) }

    const shortcut: Description = LegacyDescriptionConverter.convert(
      this.content,
    );

    return {
      // eslint-disable-next-line no-underscore-dangle
      id: this._id,
      name: this.shortcut, // Legacy shortcut name becomes the name
      shortcut,
    };
  }
}
