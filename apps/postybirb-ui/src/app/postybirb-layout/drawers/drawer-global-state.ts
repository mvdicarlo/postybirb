import { createGlobalState } from 'react-use';

export type DrawerGlobalState = {
  settingsDrawerVisible: boolean;
  accountDrawerVisible: boolean;
  tagGroupsDrawerVisible: boolean;
  tagConvertersDrawerVisible: boolean;
  notificationsDrawerVisible: boolean;
  customShortcutsDrawerVisible: boolean;
};

export const useDrawerGlobalState = createGlobalState<DrawerGlobalState>({
  settingsDrawerVisible: false,
  accountDrawerVisible: false,
  tagGroupsDrawerVisible: false,
  tagConvertersDrawerVisible: false,
  notificationsDrawerVisible: false,
  customShortcutsDrawerVisible: false,
});
