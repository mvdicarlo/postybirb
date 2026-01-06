/**
 * Barrel exports for all stores.
 */

// Base utilities
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

// Navigation Store
export {
    useCanGoBack,
    useCanGoForward,
    useNavigationHistory,
    useNavigationStore,
    useViewState,
    useViewStateActions,
    type NavigationStore
} from './navigation-store';

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
} from './appearance-store';

// Drawer Store
export {
    useActiveDrawer,
    useDrawerActions,
    useDrawerStore,
    useIsDrawerOpen,
    type DrawerKey,
    type DrawerStore
} from './drawer-store';

// Submissions UI Store
export {
    useFileSubmissionsFilter,
    useMessageSubmissionsFilter,
    useSidenavCollapsed, useSubNavVisible, useSubmissionsContentPreferences,
    useSubmissionsFilter,
    useSubmissionsUIStore, useToggleSectionPanel,
    useToggleSidenav,
    type SubmissionFilter,
    type SubmissionsUIStore
} from './submissions-ui-store';

// Accounts UI Store
export {
    AccountLoginFilter,
    useAccountsFilter,
    useAccountsUIStore,
    useHiddenWebsites as useUIHiddenWebsites,
    type AccountsUIStore
} from './accounts-ui-store';

// Templates UI Store
export {
    useTemplatesFilter,
    useTemplatesUIStore,
    type TemplatesUIStore
} from './templates-ui-store';

// Locale Store
export {
    SUPPORTED_LOCALES, useLanguageActions,
    useLocaleStore, useLanguage as useUILanguage, type LocaleStore
} from './locale-store';

// Account Store
export {
    groupAccountsByWebsite, useAccount, useAccountActions, useAccountStore,
    useAccounts, useAccountsLoading, useAccountsMap, useLoggedInAccounts, type AccountStore
} from './account-store';

// Submission Store
export {
    useArchivedSubmissions,
    useQueuedSubmissions, useRegularSubmissions, useScheduledSubmissions, useSubmission, useSubmissionActions, useSubmissionStore,
    useSubmissions, useSubmissionsByType, useSubmissionsLoading, useSubmissionsMap, useSubmissionsWithErrors, useTemplateSubmissions, type SubmissionStore
} from './submission-store';

// Custom Shortcut Store
export {
    customShortcutStoreRef,
    useCustomShortcutActions, useCustomShortcutStore,
    useCustomShortcuts, useCustomShortcutsLoading, useCustomShortcutsMap, type CustomShortcutStore
} from './custom-shortcut-store';

// Directory Watcher Store
export {
    useActiveDirectoryWatchers,
    useDirectoryWatcherActions, useDirectoryWatcherStore,
    useDirectoryWatchers, useDirectoryWatchersLoading, useDirectoryWatchersMap, type DirectoryWatcherStore
} from './directory-watcher-store';

// Notification Store
export {
    useErrorNotifications, useNotificationActions, useNotificationStore,
    useNotifications, useNotificationsLoading, useNotificationsMap, useUnreadNotificationCount, useUnreadNotifications, useWarningNotifications, type NotificationStore
} from './notification-store';

// Tag Converter Store
export {
    useTagConverterActions, useTagConverterStore,
    useTagConverters, useTagConvertersLoading, useTagConvertersMap, type TagConverterStore
} from './tag-converter-store';

// Tag Group Store
export {
    useNonEmptyTagGroups,
    useTagGroupActions, useTagGroupStore,
    useTagGroups, useTagGroupsLoading, useTagGroupsMap, type TagGroupStore
} from './tag-group-store';

// User Converter Store
export {
    useUserConverterActions, useUserConverterStore,
    useUserConverters, useUserConvertersLoading, useUserConvertersMap, type UserConverterStore
} from './user-converter-store';

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
} from './settings-store';

// Website Store
export {
    useFileWebsites,
    useMessageWebsites,
    useWebsite,
    useWebsiteActions,
    useWebsiteStore,
    useWebsites,
    useWebsitesLoading,
    useWebsitesMap,
    type WebsiteStore
} from './website-store';

// Record classes
export * from './records';
