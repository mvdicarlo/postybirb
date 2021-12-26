import { EuiProvider, EuiThemeProvider } from '@elastic/eui';
import AppLayout from './app-layout';

export function App() {
  const theme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  return (
    <div className="postybirb">
      <EuiProvider colorMode={theme}>
        <AppLayout />
      </EuiProvider>
    </div>
  );
}

export default App;
