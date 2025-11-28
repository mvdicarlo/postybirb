import { ITagGroup } from '@postybirb/types';
import {
    LegacyConverterEntity,
    MinimalEntity,
} from './legacy-converter-entity';

/**
 * Legacy tag group entity from PostyBirb Plus
 * Represents a group of tags that can be applied together
 */
export class LegacyTagGroup implements LegacyConverterEntity<ITagGroup> {
  _id: string;

  created: number;

  lastUpdated: number;

  alias: string;

  tags: string[];

  constructor(data: Partial<LegacyTagGroup>) {
    Object.assign(this, data);
  }

  convert(): MinimalEntity<ITagGroup> {
    return {
      // eslint-disable-next-line no-underscore-dangle
      id: this._id,
      name: this.alias,
      tags: this.tags,
    };
  }
}
