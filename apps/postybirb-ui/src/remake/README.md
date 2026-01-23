# PostyBirb UI - Remake

This folder contains the redesigned PostyBirb UI built with React, Mantine UI, and Zustand for state management.

## Folder Structure

```
remake/
├── api/                    # API client modules
├── components/             # React components
│   ├── dialogs/            # Modal dialogs (e.g., Settings)
│   ├── drawers/            # Side drawers (e.g., Accounts, Notifications)
│   ├── error-boundary/     # Error boundary components
│   └── layout/             # Core layout components
├── config/                 # Configuration (keybindings, nav items)
├── hooks/                  # Custom React hooks
├── providers/              # React context providers
├── routes/                 # Route definitions and page components
│   └── pages/              # Page-level components
├── stores/                 # Zustand stores
│   └── records/            # Record wrapper classes for DTOs
├── styles/                 # Global CSS styles
├── theme/                  # Mantine theme configuration
├── transports/             # HTTP client and WebSocket utilities
└── types/                  # TypeScript type definitions
```

## Key Concepts

### State Management (Zustand)

All entity data is managed through Zustand stores located in `stores/`. The stores follow a consistent pattern using `createEntityStore()`:

```typescript
// Example usage
const useAccountStore = createEntityStore<AccountDto, AccountRecord>(
  fetchAccounts,
  (dto) => new AccountRecord(dto),
  { storeName: 'AccountStore', websocketEvent: ACCOUNT_UPDATES }
);
```

**Key stores:**

- `account-store.ts` - Website accounts and login state
- `submission-store.ts` - Submissions (file, message, templates)
- `settings-store.ts` - Application settings (single record)
- `notification-store.ts` - System notifications
- `ui-store.ts` - UI state (drawers, sidenav, filters)

### Record Classes

DTOs from the API are wrapped in Record classes (`stores/records/`) that provide:

- Type-safe property access
- Computed/derived properties
- Utility methods for common operations
- `toDto()` for API updates

```typescript
// Example
const account = useAccount(id);
account.isLoggedIn;        // Computed property
account.displayName;       // Fallback logic built-in
account.toDto();           // Convert back to DTO
```

### Store Initialization

Stores are initialized at app startup via `useInitializeStores()` hook in the root component. This loads all entity data in parallel and sets up WebSocket listeners for real-time updates.

```typescript
// In App component
const { isLoading, error } = useInitializeStores();
```

### CSS Naming Convention

Global CSS classes follow the `postybirb__snake_case` naming pattern:

```css
/* Base class */
.postybirb__sidenav {
}

/* Modifier state (use -- suffix) */
.postybirb__sidenav--collapsed {
}

/* Child elements (use _ separator) */
.postybirb__sidenav_header {
}
.postybirb__sidenav_nav {
}
```

CSS Modules are used for component-specific styles (e.g., `settings-dialog.module.css`).

### Layout System

The app uses a custom flexbox layout (not Mantine AppShell) for full control:

- **SideNav**: Fixed left navigation (collapsible, 280px → 60px)
- **Main**: Content area with margin adjusted for sidenav
- **SubNavBar**: Optional horizontal contextual navigation
- **ContentNavbar**: Title, pagination, and action buttons
- **ContentArea**: Scrollable content container

Layout state is managed in `ui-store.ts`:

```typescript
const collapsed = useSidenavCollapsed();
const { setSidenavCollapsed } = useToggleSidenav();
```

### API Layer

API modules in `api/` extend `BaseApi` or use `HttpClient` directly:

```typescript
class AccountApi extends BaseApi<AccountDto> {
  constructor() {
    super('account');
  }

  // Custom methods
  login(id: EntityId) {
    return this.client.post<AccountDto>(`${id}/login`);
  }
}
```

The `HttpClient` (`transports/http-client.ts`) provides:

- Automatic retry with exponential backoff
- Remote mode support (client connecting to host)
- Consistent error handling

### Drawer/Dialog System

Drawers and dialogs are controlled via `ui-store.ts`:

```typescript
// Open a drawer
const { openDrawer, closeDrawer } = useDrawerActions();
openDrawer('settings');

// Check active drawer
const activeDrawer = useActiveDrawer();
```

Available drawer keys: `'settings'`, `'accounts'`, `'notifications'`, `'tag-groups'`, `'tag-converters'`, `'user-converters'`, `'custom-shortcuts'`

### Internationalization (i18n)

Uses Lingui for translations:

```typescript
import { Trans } from '@lingui/react/macro';

// In JSX
<Trans>Settings</Trans>

// For strings
const { t } = useLingui();
const label = t`None`;
```

Translation files are in `lang/` at the project root.

### Keybindings

Global keybindings are defined in `config/keybindings.ts` and activated via `useKeybindings()` hook in the layout.

## Best Practices

### Component Organization

1. **Pages** go in `routes/pages/<feature>/`
2. **Shared components** go in `components/<category>/`
3. **Feature-specific components** can be co-located with their page

### Store Usage

1. Use selector hooks for performance (prevents unnecessary re-renders):

   ```typescript
   // Good - only re-renders when this specific value changes
   const isLoggedIn = useAccountStore((state) => state.records.find(r => r.id === id)?.isLoggedIn);

   // Avoid - re-renders on any store change
   const store = useAccountStore();
   ```

2. Actions are accessed via dedicated hooks:
   ```typescript
   const { openDrawer } = useDrawerActions();
   ```

### Error Handling

Use specialized error boundaries for different contexts:

```typescript
import { SubmissionErrorBoundary } from '../error-boundary';

<SubmissionErrorBoundary submissionId={id}>
  <SubmissionComponent />
</SubmissionErrorBoundary>
```

### Adding New Entities

1. Create API module in `api/`
2. Create Record class in `stores/records/`
3. Create store with `createEntityStore()` in `stores/`
4. Add to `store-init.ts` for initialization
5. Export from `stores/index.ts`

## File Patterns

| Pattern        | Purpose                     |
| -------------- | --------------------------- |
| `*.api.ts`     | API client modules          |
| `*-store.ts`   | Zustand stores              |
| `*-record.ts`  | DTO wrapper classes         |
| `*.module.css` | CSS Modules (scoped styles) |
| `*-page.tsx`   | Page-level components       |
| `use-*.ts`     | Custom React hooks          |
