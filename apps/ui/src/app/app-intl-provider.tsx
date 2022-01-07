import { IntlProvider } from 'react-intl';
import { createContext, useState } from 'react';
import { PropsWithChildren } from 'react-virtualized-auto-sizer/node_modules/@types/react';
import locales from '@postybirb/translations';
import { LS_LANGUAGE_KEY } from '../constants';

function getLocaleData(locale: string) {
  return locales[locale] ?? locales[locale.split('-')[0]] ?? locales.en;
}

export type AppIntlContext = {
  locale: string;
  changeLocale: (value: string) => void;
};

const Context = createContext<AppIntlContext>({} as AppIntlContext);

function AppIntlProvider({ children }: PropsWithChildren<any>): JSX.Element {
  const [locale, setLocale] = useState<string>(
    localStorage.getItem(LS_LANGUAGE_KEY) ?? navigator.language
  );

  function changeLocale(value: string) {
    setLocale(value);
    localStorage.setItem(LS_LANGUAGE_KEY, value);
  }

  return (
    <Context.Provider value={{ locale, changeLocale }}>
      <IntlProvider
        key={locale}
        locale={locale}
        messages={getLocaleData(locale)}
        defaultLocale="en"
      >
        {children}
      </IntlProvider>
    </Context.Provider>
  );
}

export default AppIntlProvider;
