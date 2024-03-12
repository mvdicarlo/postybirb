import { SettingsStore } from './settings.store';
import { useStore } from './use-store';

export function useSettings() {
  const settings = useStore(SettingsStore);
  return {
    settingsId: settings.state[0]?.id,
    reloadSettings: settings.reload,
    isLoading: settings.isLoading,
    settings: settings.state[0]?.settings,
  };
}
