import styles from './app.module.css';
import { ReactComponent as Logo } from './logo.svg';
import star from './star.svg';
import { EuiProvider } from '@elastic/eui';
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
