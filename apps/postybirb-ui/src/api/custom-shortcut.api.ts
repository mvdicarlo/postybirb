import {
    ICreateCustomShortcutDto,
    ICustomShortcutDto,
    IUpdateCustomShortcutDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class CustomShortcutsApi extends BaseApi<
  ICustomShortcutDto,
  ICreateCustomShortcutDto,
  IUpdateCustomShortcutDto
> {
  constructor() {
    super('custom-shortcut');
  }
}

export default new CustomShortcutsApi();
