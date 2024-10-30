import { useLocalStorage } from './use-local-storage';

export function use18n(): [string, (lang: string) => void] {
  const defaultLanguage = navigator.language.split('-')[0];
  const [locale, setLocale] = useLocalStorage<string>(
    'user-language',
    defaultLanguage ?? 'en',
  );

  return [locale as string, setLocale];
}
