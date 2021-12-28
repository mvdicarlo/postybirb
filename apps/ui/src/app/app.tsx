import { EuiProvider } from '@elastic/eui';
import { useContext } from 'react';
import AppLayout from './app-layout';
import { AppThemeContext } from './app-theme-provider';

export function App() {
  const [theme] = useContext(AppThemeContext);
  return (
    <div className="postybirb">
      <EuiProvider colorMode={theme}>
        <AppLayout />
      </EuiProvider>
    </div>
  );
}

export default App;
