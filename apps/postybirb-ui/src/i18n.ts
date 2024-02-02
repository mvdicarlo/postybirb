import { i18n } from '@lingui/core';
import { SettingsStore } from './stores/settings.store';

SettingsStore.updates.subscribe((e) => {
  setLocale(e[0].settings.language);
});

/**
 * Loades language locale and activates it
 * @param locale - Locale to use
 */
async function setLocale(locale: string) {
  // Vite plugin lingui automatically convert .po
  // files into plain json during production build
  // Also we dont need to cache these imported messages
  // because browser's import call does it automatically
  const { messages } = await import(`./lang/${locale}.po`);
  i18n.loadAndActivate({ locale, messages });
}