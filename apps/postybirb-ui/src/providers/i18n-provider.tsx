/**
 * I18nProvider - Wraps the application with Lingui i18n support.
 * Listens to language changes from the UI store.
 */

/* eslint-disable lingui/no-unlocalized-strings */
import { i18n } from '@lingui/core';
import { I18nProvider as LinguiI18nProvider } from '@lingui/react';
import { Group, Loader } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useLanguage } from '../stores/ui/locale-store';

/**
 * Provides Lingui i18n context and Mantine DatesProvider for the app.
 * Loads locale messages dynamically from the lang directory.
 * Listens to language state from UI store for reactive updates.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useLanguage();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadLocale = async () => {
      // Vite plugin lingui converts .po files into JSON and maps this dynamic
      // import during the production build. The module cache handles reuse.
      const lang = locale ?? 'en';
      const { messages } = await import(`../../../../lang/${lang}.po`);

      if (!cancelled) {
        i18n.loadAndActivate({ locale: lang, messages });
        dayjs.locale(lang);
        setLoaded(true);
      }
    };

    loadLocale().catch((error) => {
      if (!cancelled) {
        // eslint-disable-next-line no-console
        console.error('Failed to load locale:', locale, error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const [tooLongLoading, setTooLongLoading] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!loaded) {
        setTooLongLoading(true);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [loaded]);

  if (loaded) {
    return (
      <LinguiI18nProvider i18n={i18n}>
        <DatesProvider settings={{ locale }}>{children}</DatesProvider>
      </LinguiI18nProvider>
    );
  }

  return (
    <Group justify="center" align="center" style={{ minHeight: '100vh' }}>
      <Loader />
      <div>Loading translations...</div>
      {tooLongLoading && (
        <div>
          Loading takes too much time, please check the console for errors.
        </div>
      )}
    </Group>
  );
}
