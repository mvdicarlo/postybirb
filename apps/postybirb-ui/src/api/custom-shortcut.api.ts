import {
  CreateCustomShortcutDto,
  ICustomShortcutDto,
  UpdateCustomShortcutDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class CustomShortcutsApi extends BaseApi<
  ICustomShortcutDto,
  CreateCustomShortcutDto,
  UpdateCustomShortcutDto
> {
  constructor() {
    super('custom-shortcut');
  }
}

export default new CustomShortcutsApi();
