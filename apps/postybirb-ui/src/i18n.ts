import { i18n } from '@lingui/core';
import { SettingsStore } from './stores/settings.store';

// TODO Maybe add rest api load logic and move lang folder to root
// TODO Not sure because then we will get no fast refresh
export async function loadCatalog(locale: string) {
  const { messages } = await import(`./lang/${locale}.po`);
  i18n.loadAndActivate({ locale, messages });
}

SettingsStore.updates.subscribe((e) => {
  loadCatalog(e[0].settings.language);
});
