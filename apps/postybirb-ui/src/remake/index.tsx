/**
 * RemakeApp - Entry point for the remake UI with all providers.
 * Wraps the application with MantineProvider, i18n, and Router.
 */

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

import { MantineProvider } from '@mantine/core';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/layout/layout';
import { I18nProvider } from './providers/i18n-provider';
import { routes } from './routes';
import './styles/layout.css';
import { cssVariableResolver } from "./theme/css-variable-resolver";
import { theme } from "./theme/theme";
import './theme/theme-styles.css';

/**
 * Create router with Layout as the root element.
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: routes,
  },
]);

/**
 * Props for RemakeApp component.
 */
interface RemakeAppProps {
  /** Locale for translations (default: 'en') */
  locale?: string;
}

/**
 * Root application component for the remake UI.
 * Includes all necessary providers: Mantine, i18n, and React Router.
 */
export function RemakeApp({ locale = 'en' }: RemakeAppProps) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariableResolver} defaultColorScheme="auto">
      <I18nProvider locale={locale}>
        <RouterProvider router={router} />
      </I18nProvider>
    </MantineProvider>
  );
}

// Default export for convenient importing
export default RemakeApp;
