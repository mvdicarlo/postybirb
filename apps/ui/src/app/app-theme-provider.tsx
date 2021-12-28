import { useState, createContext, PropsWithChildren } from 'react';

const themeOnStart =
  localStorage.getItem('theme') ??
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

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

  function setTheme(changeTo: ThemeColors) {
    if (theme !== changeTo) {
      setThemeState(changeTo);
      const themeEl = document.getElementById('dark_theme');
      if (themeEl) {
        (themeEl as HTMLLinkElement).disabled = changeTo !== 'dark';
      }
    }
  }

  return [theme, setTheme];
}

export const AppThemeContext = createContext<AppThemeProviderContext>(
  undefined as any
);

export default function AppThemeProvider({ children }: PropsWithChildren<any>) {
  const themeState = useTheme({ theme: themeOnStart });
  return (
    <AppThemeContext.Provider value={themeState}>
      {children}
    </AppThemeContext.Provider>
  );
}
