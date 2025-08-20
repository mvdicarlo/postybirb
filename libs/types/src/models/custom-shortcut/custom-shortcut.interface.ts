import { IEntity } from '../database/entity.interface';
import { DescriptionValue } from '../submission/description-value.type';

export interface ICustomShortcut extends IEntity {
  name: string;
  inline: boolean;
  shortcut: DescriptionValue;
}
