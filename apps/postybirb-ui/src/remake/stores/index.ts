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

// UI Store
export {
    useActiveDrawer,
    useDrawerActions,
    useFileSubmissionsFilter,
    useMessageSubmissionsFilter, useSidenavCollapsed, useSubNavVisible, useToggleSidenav, useUIStore, type DrawerKey,
    type SubmissionFilter,
    type UIStore
} from './ui-store';

// Account Store
export {
    useAccount, useAccountActions, useAccountStore,
    useAccounts, useAccountsByWebsite, useAccountsLoading, useAccountsMap, useLoggedInAccounts, type AccountStore
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
