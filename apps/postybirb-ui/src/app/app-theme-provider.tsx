import { useState, createContext, PropsWithChildren, useCallback } from 'react';
import { EuiProvider } from '@elastic/eui';
import { LS_THEME_KEY } from '../constants';

let themeOnStart: ThemeColors = localStorage.getItem(
  LS_THEME_KEY
) as ThemeColors;

if (!themeOnStart) {
  themeOnStart = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

if (themeOnStart !== 'dark') {
  const themeEl = document.getElementById('dark_theme');
  if (themeEl) {
    (themeEl as HTMLLinkElement).disabled = true;
  }
}

export type ThemeColors = 'dark' | 'light';

export type AppThemeProviderContext = [
  theme: ThemeColors,
  setTheme: (changeTo: ThemeColors) => void
];

export type UseThemeProps = {
  theme: ThemeColors;
};

function useTheme(props: UseThemeProps): AppThemeProviderContext {
  const [theme, setThemeState] = useState<ThemeColors>(props.theme);

  const setTheme = useCallback((changeTo: ThemeColors) => {
    setThemeState(changeTo);
    localStorage.setItem(LS_THEME_KEY, changeTo);
    const themeEl = document.getElementById('dark_theme');
    if (themeEl) {
      (themeEl as HTMLLinkElement).disabled = changeTo !== 'dark';
    }
  }, []);

  return [theme, setTheme];
}

export const AppThemeContext = createContext<AppThemeProviderContext>(
  {} as AppThemeProviderContext
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AppThemeProvider({ children }: PropsWithChildren<any>) {
  const themeState = useTheme({ theme: themeOnStart });
  return (
    <AppThemeContext.Provider value={themeState}>
      <EuiProvider colorMode={themeState[0]}>{children}</EuiProvider>
    </AppThemeContext.Provider>
  );
}
