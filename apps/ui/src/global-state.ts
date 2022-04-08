import { createGlobalState } from 'react-use';

export type GlobalState = {
  settingsVisible: boolean;
  accountFlyoutVisible: boolean;
};

export const useGlobalState = createGlobalState<GlobalState>({
  settingsVisible: false,
  accountFlyoutVisible: false,
});
