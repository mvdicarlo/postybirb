import { createGlobalState } from 'react-use';

export type GlobalState = {
  settingsVisible: boolean;
  accountFlyoutVisible: boolean;
  tagGroupsFlyoutVisible: boolean;
  tagConvertersFlyoutVisible: boolean;
};

export const useGlobalState = createGlobalState<GlobalState>({
  settingsVisible: false,
  accountFlyoutVisible: false,
  tagGroupsFlyoutVisible: false,
  tagConvertersFlyoutVisible: false,
});
