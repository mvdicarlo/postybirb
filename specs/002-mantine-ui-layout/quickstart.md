# Quickstart: Mantine UI Layout Foundation

**Feature**: 002-mantine-ui-layout  
**Date**: December 6, 2025

## Prerequisites

- Node.js 24.6.0 or higher
- Yarn (corepack-managed)
- PostyBirb repository cloned and dependencies installed

## Getting Started

### 1. Install/Update Mantine v8

The remake uses Mantine v8. Update dependencies:

```bash
yarn add @mantine/core@^8 @mantine/hooks@^8 @mantine/dates@^8
```

### 2. Access the Remake

The remake layout is self-contained in:
```
apps/postybirb-ui/src/remake/
```

### 3. Entry Point

Import and render the RemakeApp in your application:

```tsx
import { RemakeApp } from './remake';

// In your main.tsx or app entry point
function App() {
  return <RemakeApp />;
}
```

### 4. Development Server

Start the development server:

```bash
yarn start
```

The UI will be available at `http://localhost:5173` (or configured port).

## Key Components

### RemakeI18nProvider

Wraps the app with Lingui i18n support:

```tsx
import { RemakeI18nProvider } from './remake/providers/remake-i18n-provider';

// Already included in RemakeApp, but can be used standalone:
<RemakeI18nProvider locale="en">
  <YourComponents />
</RemakeI18nProvider>
```

### Layout

The main layout shell (custom flexbox, no AppShell):

```tsx
import { Layout } from './remake/components/layout/layout';

// Provides sidenav, sub-nav, content navbar, and content area
```

### SideNav

Collapsible side navigation using Mantine NavLink:

```tsx
import { SideNav } from './remake/components/layout/side-nav';
import { IconHome, IconSend, IconSettings } from '@tabler/icons-react';

const navItems = [
  { id: 'home', label: 'Home', icon: IconHome, path: '/' },
  { id: 'submissions', label: 'Submissions', icon: IconSend, path: '/submissions' },
  { id: 'settings', label: 'Settings', icon: IconSettings, path: '/settings' },
];
```

### SubNavBar

Contextual sub-navigation with horizontal scroll:

```tsx
import { SubNavBar } from './remake/components/layout/sub-nav-bar';

<SubNavBar
  config={{
    visible: true,
    items: [
      { id: 'all', label: 'All', active: true },
      { id: 'drafts', label: 'Drafts' },
      { id: 'scheduled', label: 'Scheduled' },
    ],
  }}
/>
```

### ContentNavbar

Content area navbar with pagination:

```tsx
import { ContentNavbar } from './remake/components/layout/content-navbar';

<ContentNavbar
  config={{
    showPagination: true,
    pagination: { currentPage: 1, totalPages: 10 },
    title: 'Submissions',
  }}
  onPageChange={(page) => console.log('Page:', page)}
/>
```

## Internationalization (i18n)

The remake uses Lingui for translations. Use the macros for translatable strings:

```tsx
import { Trans, t } from '@lingui/macro';

// In JSX:
<Trans>Hello World</Trans>

// In JavaScript:
const message = t`Hello World`;
```

To extract translations:

```bash
yarn lingui:extract
```

## Adding New Pages

1. Create a new page component in `remake/routes/pages/`:

```tsx
// remake/routes/pages/my-page/MyPage.tsx
import { Trans } from '@lingui/macro';

export function MyPage() {
  return <div><Trans>My Page Content</Trans></div>;
}
```

2. Add route in `remake/routes/index.tsx`:

```tsx
{
  path: 'my-page',
  element: <MyPage />,
}
```

3. Add navigation item to sidenav configuration.

## Customizing the Layout

### Sidenav Width

Adjust in `layout.tsx` or `styles/layout.css`:

```css
.sidenav {
  width: 280px; /* Expanded width */
}

.sidenav.collapsed {
  width: 60px; /* Collapsed width (icons only) */
}
```

### Sub-Navigation Scrolling

Horizontal scroll is automatic via Mantine's `ScrollArea`. Items will scroll when they exceed container width.

## File Structure

```
apps/postybirb-ui/src/remake/
├── index.tsx                    # Entry point with all providers
├── providers/
│   └── remake-i18n-provider.tsx # Lingui i18n setup
├── components/
│   └── layout/
│       ├── layout.tsx           # Main custom layout (no AppShell)
│       ├── side-nav.tsx         # Collapsible sidenav
│       ├── nav-item.tsx         # Individual nav item
│       ├── sub-nav-bar.tsx      # Horizontal sub-nav
│       └── content-navbar.tsx   # Pagination navbar
├── routes/
│   ├── index.tsx                # Route configuration
│   └── pages/
│       ├── home/
│       ├── submissions/
│       └── settings/
├── hooks/
│   └── use-sidenav.ts           # Sidenav state hook
├── styles/
│   └── layout.css               # Layout CSS
└── types/
    └── navigation.ts            # Type definitions
```

## Testing the Layout

1. **Sidenav collapse**: Click the collapse button to toggle between expanded and collapsed states
2. **Navigation**: Click sidenav items to navigate between sections
3. **Sub-nav**: Observe sub-nav content changes per section
4. **Pagination**: Use pagination controls in content navbar
5. **Persistence**: Refresh the page - sidenav state should persist
6. **Translations**: Change locale and verify translated strings update
