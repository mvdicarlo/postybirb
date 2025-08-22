import { IEntity } from '../database/entity.interface';
import {
  Description
} from '../submission/description-value.type';

export interface ICustomShortcut extends IEntity {
  name: string;
  inline: boolean;
  shortcut: Description;
}
