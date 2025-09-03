import { CUSTOM_SHORTCUT_UPDATES } from '@postybirb/socket-events';
import { ICustomShortcutDto } from '@postybirb/types';
import customShortcutApi from '../api/custom-shortcut.api';
import StoreManager from './store-manager';

export const CustomShortcutStore: StoreManager<ICustomShortcutDto> =
  new StoreManager<ICustomShortcutDto>(CUSTOM_SHORTCUT_UPDATES, () =>
    customShortcutApi.getAll().then(({ body }) => body),
  );
