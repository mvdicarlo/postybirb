import { ICustomShortcut } from '../../models';

export type IUpdateCustomShortcutDto = Pick<
  ICustomShortcut,
  'name' | 'inline' | 'shortcut'
>;
