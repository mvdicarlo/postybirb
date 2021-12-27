import { EuiButton, EuiProvider } from '@elastic/eui';
import { useState } from 'react';
import AppLayout from './app-layout';

export function App() {
  const [theme, setTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  return (
    <div className="postybirb">
      <EuiProvider colorMode={theme}>
        <EuiButton
          onClick={() => {
            setTheme(theme === 'dark' ? 'light' : 'dark');
            const themeEl = document.getElementById(
              'dark_theme'
            ) as HTMLLinkElement;
            themeEl.disabled = !themeEl.disabled;
          }}
        >
          Hello
        </EuiButton>
        <AppLayout />
      </EuiProvider>
    </div>
  );
}

export default App;
