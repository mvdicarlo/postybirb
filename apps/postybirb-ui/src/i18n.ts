import { i18n } from '@lingui/core';
import { msg } from '@lingui/macro';
import { SettingsStore } from './stores/settings.store';

/**
 * Loads language locale and activates it
 * @param locale - Locale to use
 */
async function setLocale(locale: string) {
  // Vite plugin lingui automatically convert .po
  // files into plain json during production build
  // and vite converts dynamic import into path map
  //
  // We dont need to cache these imported messages
  // because browser's import call does it automatically
  const { messages } = await import(`./lang/${locale}.po`);
  i18n.loadAndActivate({ locale, messages });
}

SettingsStore.updates.subscribe((e) => {
  setLocale(e[0].settings.language);
});

export const sharedMessages = {
  noItems: msg`No items`,
};