import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@lingui/core';
import { I18nProvider as LinguiI18nProvider } from '@lingui/react';
import { useCallback, useEffect, useState } from 'react';
import { SettingsStore } from '../../stores/settings.store';

type I18nProviderProps = {
  children: React.ReactNode;
};

export function I18nProvider(props: I18nProviderProps) {
  const [loaded, setLoaded] = useState(false);

  const setLocale = useCallback(
    async (locale: string) => {
      // Vite plugin lingui automatically convert .po
      // files into plain json during production build
      // and vite converts dynamic import into the path map
      //
      // We dont need to cache these imported messages
      // because browser's import call does it automatically
      const { messages } = await import(`../../lang/${locale}.po`);
      i18n.loadAndActivate({ locale, messages });
      if (!loaded) setLoaded(true);
    },
    [loaded]
  );

  useEffect(() => {
    SettingsStore.updates.subscribe((e) => {
      setLocale(e[0].settings.language);
    });
  }, [setLocale]);

  if (loaded) {
    return <LinguiI18nProvider i18n={i18n} {...props} />;
  }

  return (
    <EuiFlexGroup alignItems="center" justifyContent="center">
      <EuiLoadingSpinner size="xl" />
      {
        // eslint-disable-next-line lingui/no-unlocalized-strings
      }
      Loading translations...
    </EuiFlexGroup>
  );
}
