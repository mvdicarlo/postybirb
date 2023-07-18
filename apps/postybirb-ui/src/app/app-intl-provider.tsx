import { IntlProvider } from 'react-intl';
import { createContext, useMemo, useState } from 'react';
import { PropsWithChildren } from 'react-virtualized-auto-sizer/node_modules/@types/react';
import locales from '@postybirb/translations';
import { LS_LANGUAGE_KEY } from '../constants';

function getLocaleData(locale: string) {
  return (
    locales[locale] ?? locales[locale.split('-')[0]] ?? (locales as any).en
  );
}

export type AppIntlContext = {
  locale: string;
  changeLocale: (value: string) => void;
};

const Context = createContext<AppIntlContext>({} as AppIntlContext);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AppIntlProvider({ children }: PropsWithChildren<any>): JSX.Element {
  const [locale, setLocale] = useState<string>(
    localStorage.getItem(LS_LANGUAGE_KEY) ?? navigator.language
  );

  function changeLocale(value: string) {
    setLocale(value);
    localStorage.setItem(LS_LANGUAGE_KEY, value);
  }

  const contextValue = useMemo(() => ({ locale, changeLocale }), [locale]);

  return (
    <Context.Provider value={contextValue}>
      <IntlProvider
        key={locale}
        locale={locale}
        messages={getLocaleData(locale)}
        defaultLocale="en"
        onError={(p) => {
          // nothing
        }}
      >
        {children}
      </IntlProvider>
    </Context.Provider>
  );
}

export default AppIntlProvider;
