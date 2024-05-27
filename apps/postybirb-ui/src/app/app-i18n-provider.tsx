import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@lingui/core';
import { I18nProvider as LinguiI18nProvider } from '@lingui/react';
import { Locale as UppyLocale } from '@uppy/core';
import { useCallback, useEffect, useState } from 'react';
import { use18n } from '../hooks/use-i18n';
import { uppyLocales } from './languages';

declare module '@lingui/core' {
  interface I18n {
    uppy: UppyLocale;
  }
}

type AppI18nProviderProps = {
  children: React.ReactNode;
};

export function AppI18nProvider(props: AppI18nProviderProps) {
  const [locale] = use18n();
  const [loaded, setLoaded] = useState(false);

  const setLocale = useCallback(
    async (lang: string) => {
      // Vite plugin lingui automatically convert .po
      // files into plain json during production build
      // and vite converts dynamic import into the path map
      //
      // We dont need to cache these imported messages
      // because browser's import call does it automatically
      // eslint-disable-next-line no-param-reassign
      lang = lang ?? 'en';
      const { messages } = await import(`../lang/${lang}.po`);

      const uppyLocale = uppyLocales[lang];
      try {
        i18n.uppy = (
          await import(`../../public/uppy-i18n/${uppyLocale}.js`)
        ).default;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          // eslint-disable-next-line lingui/no-unlocalized-strings
          `Failed to load uppy locale for ${lang}, mapped: ${uppyLocale}, error:`,
          error
        );
      }

      i18n.loadAndActivate({ locale: lang, messages });
      if (!loaded) setLoaded(true);
    },
    [loaded]
  );

  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);

  const [tooLongLoading, setTooLongLoading] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      if (!loaded) {
        setTooLongLoading(true);
      }
    }, 5000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loaded) {
    return <LinguiI18nProvider i18n={i18n} {...props} />;
  }

  return (
    <EuiFlexGroup justifyContent="center" style={{ alignContent: 'center' }}>
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiLoadingSpinner size="xl" />
        {
          // eslint-disable-next-line lingui/no-unlocalized-strings
        }
        Loading translations...
      </EuiFlexGroup>
      {tooLongLoading &&
        // eslint-disable-next-line lingui/no-unlocalized-strings
        'Loading takes too much time, please check the console for the errors.'}
    </EuiFlexGroup>
  );
}
