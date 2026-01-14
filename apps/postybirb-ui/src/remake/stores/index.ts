/**
 * Barrel exports for all stores.
 */

// =============================================================================
// Base Utilities
// =============================================================================

export {
    createEntityStore,
    useLoadingStateSelector,
    useRecordsSelector,
    type BaseEntityActions,
    type BaseEntityState,
    type CreateEntityStoreOptions,
    type EntityStore,
    type LoadingState
} from './create-entity-store';

// Store initialization
export {
    areAllStoresLoaded,
    clearAllStores,
    loadAllStores,
    useInitializeStores
} from './store-init';

// =============================================================================
// UI Stores (localStorage-persisted)
// =============================================================================

// Navigation Store
export {
    useCanGoBack,
    useCanGoForward,
    useNavigationHistory,
    useNavigationStore,
    useViewState,
    useViewStateActions,
    type NavigationStore
} from './ui/navigation-store';

// Appearance Store
export {
    MANTINE_COLORS,
    useAppearanceActions,
    useAppearanceStore,
    useColorScheme,
    useIsCompactView,
    usePrimaryColor,
    useSubmissionViewMode,
    type AppearanceStore,
    type ColorScheme,
    type MantinePrimaryColor,
    type SubmissionViewMode
} from './ui/appearance-store';

// Drawer Store
export {
    useActiveDrawer,
    useDrawerActions,
    useDrawerStore,
    useIsDrawerOpen,
    type DrawerKey,
    type DrawerStore
} from './ui/drawer-store';

// Submissions UI Store
export {
    useFileSubmissionsFilter,
    useMessageSubmissionsFilter,
    useSidenavCollapsed, useSubmissionsContentPreferences,
    useSubmissionsFilter,
    useSubmissionsUIStore, useSubNavVisible, useToggleSectionPanel,
    useToggleSidenav,
    type SubmissionFilter,
    type SubmissionsUIStore
} from './ui/submissions-ui-store';

// Accounts UI Store
export {
    AccountLoginFilter,
    useAccountsFilter,
    useAccountsUIStore,
    useHiddenWebsites as useUIHiddenWebsites,
    type AccountsUIStore
} from './ui/accounts-ui-store';

// Templates UI Store
export {
    useTemplatesFilter,
    useTemplatesUIStore,
    type TemplatesUIStore
} from './ui/templates-ui-store';

// Locale Store
export {
    SUPPORTED_LOCALES,
    useLanguageActions,
    useLocaleStore,
    useLanguage as useUILanguage,
    type LocaleStore
} from './ui/locale-store';

// =============================================================================
// Entity Stores (API-backed)
// =============================================================================

// Account Store
export {
    groupAccountsByWebsite,
    useAccount,
    useAccountActions, useAccounts,
    useAccountsLoading,
    useAccountsMap, useAccountStore, useLoggedInAccounts,
    type AccountStore
} from './entity/account-store';

// Submission Store
export {
    useArchivedSubmissions,
    useQueuedSubmissions,
    useRegularSubmissions,
    useScheduledSubmissions,
    useSubmission,
    useSubmissionActions, useSubmissions,
    useSubmissionsByType,
    useSubmissionsLoading,
    useSubmissionsMap, useSubmissionStore, useSubmissionsWithErrors,
    useTemplateSubmissions,
    type SubmissionStore
} from './entity/submission-store';

// Custom Shortcut Store
export {
    customShortcutStoreRef,
    useCustomShortcutActions, useCustomShortcuts,
    useCustomShortcutsLoading,
    useCustomShortcutsMap, useCustomShortcutStore, type CustomShortcutStore
} from './entity/custom-shortcut-store';

// Directory Watcher Store
export {
    useActiveDirectoryWatchers,
    useDirectoryWatcherActions, useDirectoryWatchers,
    useDirectoryWatchersLoading,
    useDirectoryWatchersMap, useDirectoryWatcherStore, type DirectoryWatcherStore
} from './entity/directory-watcher-store';

// Notification Store
export {
    useErrorNotifications,
    useNotificationActions, useNotifications,
    useNotificationsLoading,
    useNotificationsMap, useNotificationStore, useUnreadNotificationCount,
    useUnreadNotifications,
    useWarningNotifications,
    type NotificationStore
} from './entity/notification-store';

// Tag Converter Store
export {
    useTagConverterActions, useTagConverters,
    useTagConvertersLoading,
    useTagConvertersMap, useTagConverterStore, type TagConverterStore
} from './entity/tag-converter-store';

// Tag Group Store
export {
    useNonEmptyTagGroups,
    useTagGroupActions, useTagGroups,
    useTagGroupsLoading,
    useTagGroupsMap, useTagGroupStore, type TagGroupStore
} from './entity/tag-group-store';

// User Converter Store
export {
    useUserConverterActions, useUserConverters,
    useUserConvertersLoading,
    useUserConvertersMap, useUserConverterStore, type UserConverterStore
} from './entity/user-converter-store';

// Settings Store
export {
    useAllowAd,
    useDesktopNotifications,
    useHiddenWebsites,
    useLanguage,
    useQueuePaused,
    useSettings,
    useSettingsActions,
    useSettingsLoading,
    useSettingsOptions,
    useSettingsStore,
    useTagSearchProvider,
    type SettingsStore
} from './entity/settings-store';

// Website Store
export {
    useFileWebsites,
    useMessageWebsites,
    useWebsite,
    useWebsiteActions, useWebsites,
    useWebsitesLoading,
    useWebsitesMap, useWebsiteStore, type WebsiteStore
} from './entity/website-store';

// =============================================================================
// Record Classes
// =============================================================================

export * from './records';

