/**
 * View state types for state-driven navigation.
 * Uses discriminated unions with type-specific parameters.
 */

import type { SubmissionType } from '@postybirb/types';

// =============================================================================
// Section IDs - All possible section/view types
// =============================================================================

/**
 * All valid section identifiers in the application.
 * Only includes sections that render as full views, not drawers.
 */
export type SectionId =
  | 'home'
  | 'accounts'
  | 'file-submissions'
  | 'message-submissions'
  | 'templates';

// =============================================================================
// Section-Specific Parameters
// =============================================================================

/**
 * Home section has no parameters.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface HomeParams {
  // Empty - home has no specific state
}

/**
 * Parameters for accounts view.
 */
export interface AccountsParams {
  /** Selected account ID for detail view */
  selectedId: string | null;
  /** Filter by website ID */
  websiteFilter: string | null;
}

/**
 * Parameters for file submissions view.
 */
export interface FileSubmissionsParams {
  /** Selected submission IDs */
  selectedIds: string[];
  /** Selection mode */
  mode: 'single' | 'multi';
  /** Submission type filter (always FILE for this section, but useful for shared components) */
  submissionType: typeof SubmissionType.FILE;
}

/**
 * Parameters for message submissions view.
 */
export interface MessageSubmissionsParams {
  /** Selected submission IDs */
  selectedIds: string[];
  /** Selection mode */
  mode: 'single' | 'multi';
  /** Submission type filter (always MESSAGE for this section) */
  submissionType: typeof SubmissionType.MESSAGE;
}

/**
 * Parameters for templates view.
 */
export interface TemplatesParams {
  /** Currently selected template ID */
  selectedId: string | null;
}

// =============================================================================
// View State - Discriminated Union
// =============================================================================

/**
 * Home view state.
 */
export interface HomeViewState {
  type: 'home';
  params: HomeParams;
}

/**
 * Accounts view state.
 */
export interface AccountsViewState {
  type: 'accounts';
  params: AccountsParams;
}

/**
 * File submissions view state.
 */
export interface FileSubmissionsViewState {
  type: 'file-submissions';
  params: FileSubmissionsParams;
}

/**
 * Message submissions view state.
 */
export interface MessageSubmissionsViewState {
  type: 'message-submissions';
  params: MessageSubmissionsParams;
}

/**
 * Templates view state.
 */
export interface TemplatesViewState {
  type: 'templates';
  params: TemplatesParams;
}

/**
 * Union type of all possible view states.
 */
export type ViewState =
  | HomeViewState
  | AccountsViewState
  | FileSubmissionsViewState
  | MessageSubmissionsViewState
  | TemplatesViewState;

// =============================================================================
// Section Panel Configuration
// =============================================================================

/**
 * Configuration for section panel visibility and behavior.
 */
export interface SectionPanelConfig {
  /** Whether this section has a section panel */
  hasPanel: boolean;
  /** Default width of the panel (if applicable) */
  defaultWidth?: number;
}

/**
 * Section panel configurations per section type.
 */
export const sectionPanelConfigs: Record<SectionId, SectionPanelConfig> = {
  home: { hasPanel: false },
  accounts: { hasPanel: true, defaultWidth: 320 },
  'file-submissions': { hasPanel: true, defaultWidth: 320 },
  'message-submissions': { hasPanel: true, defaultWidth: 320 },
  templates: { hasPanel: true, defaultWidth: 320 },
};

/**
 * Get section panel config for a given view state.
 */
export function getSectionPanelConfig(viewState: ViewState): SectionPanelConfig {
  return sectionPanelConfigs[viewState.type];
}

// =============================================================================
// Default View States
// =============================================================================

/**
 * Default view state for the application.
 */
export const defaultViewState: ViewState = {
  type: 'home',
  params: {},
};

/**
 * Create a home view state.
 */
export function createHomeViewState(): HomeViewState {
  return {
    type: 'home',
    params: {},
  };
}

/**
 * Create a default accounts view state.
 */
export function createAccountsViewState(
  overrides?: Partial<AccountsParams>
): AccountsViewState {
  return {
    type: 'accounts',
    params: {
      selectedId: null,
      websiteFilter: null,
      ...overrides,
    },
  };
}

/**
 * Create a default file submissions view state.
 */
export function createFileSubmissionsViewState(
  overrides?: Partial<FileSubmissionsParams>
): FileSubmissionsViewState {
  return {
    type: 'file-submissions',
    params: {
      selectedIds: [],
      mode: 'single',
      submissionType: 'FILE' as typeof SubmissionType.FILE,
      ...overrides,
    },
  };
}

/**
 * Create a default message submissions view state.
 */
export function createMessageSubmissionsViewState(
  overrides?: Partial<MessageSubmissionsParams>
): MessageSubmissionsViewState {
  return {
    type: 'message-submissions',
    params: {
      selectedIds: [],
      mode: 'single',
      submissionType: 'MESSAGE' as typeof SubmissionType.MESSAGE,
      ...overrides,
    },
  };
}

/**
 * Create a default templates view state.
 */
export function createTemplatesViewState(
  overrides?: Partial<TemplatesParams>
): TemplatesViewState {
  return {
    type: 'templates',
    params: {
      selectedId: null,
      ...overrides,
    },
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if view state is home.
 */
export function isHomeViewState(state: ViewState): state is HomeViewState {
  return state.type === 'home';
}

/**
 * Check if view state is accounts.
 */
export function isAccountsViewState(
  state: ViewState
): state is AccountsViewState {
  return state.type === 'accounts';
}

/**
 * Check if view state is file submissions.
 */
export function isFileSubmissionsViewState(
  state: ViewState
): state is FileSubmissionsViewState {
  return state.type === 'file-submissions';
}

/**
 * Check if view state is message submissions.
 */
export function isMessageSubmissionsViewState(
  state: ViewState
): state is MessageSubmissionsViewState {
  return state.type === 'message-submissions';
}

/**
 * Check if view state is templates.
 */
export function isTemplatesViewState(
  state: ViewState
): state is TemplatesViewState {
  return state.type === 'templates';
}

/**
 * Check if view state has a section panel.
 */
export function hasSectionPanel(state: ViewState): boolean {
  return getSectionPanelConfig(state).hasPanel;
}

// =============================================================================
// Navigation Helpers
// =============================================================================

/**
 * Type-safe navigation helper object.
 * Provides convenient methods for creating view states with parameters.
 * 
 * @example
 * ```ts
 * // Navigate to home
 * setViewState(navigateTo.home());
 * 
 * // Navigate to accounts with selection
 * setViewState(navigateTo.accounts('account-123'));
 * 
 * // Navigate to file submissions with multiple selections
 * setViewState(navigateTo.fileSubmissions(['id1', 'id2'], 'multi'));
 * ```
 */
export const navigateTo = {
  /**
   * Navigate to home view.
   */
  home: () => createHomeViewState(),

  /**
   * Navigate to accounts view.
   * @param selectedId - Optional account ID to select
   * @param websiteFilter - Optional website ID to filter by
   */
  accounts: (selectedId?: string | null, websiteFilter?: string | null) =>
    createAccountsViewState({
      selectedId: selectedId ?? null,
      websiteFilter: websiteFilter ?? null,
    }),

  /**
   * Navigate to file submissions view.
   * @param selectedIds - Optional array of submission IDs to select
   * @param mode - Optional selection mode ('single' or 'multi')
   */
  fileSubmissions: (selectedIds?: string[], mode?: 'single' | 'multi') =>
    createFileSubmissionsViewState({
      selectedIds: selectedIds ?? [],
      mode: mode ?? 'single',
    }),

  /**
   * Navigate to message submissions view.
   * @param selectedIds - Optional array of submission IDs to select
   * @param mode - Optional selection mode ('single' or 'multi')
   */
  messageSubmissions: (selectedIds?: string[], mode?: 'single' | 'multi') =>
    createMessageSubmissionsViewState({
      selectedIds: selectedIds ?? [],
      mode: mode ?? 'single',
    }),

  /**
   * Navigate to templates view.
   * @param selectedId - Optional template ID to select
   */
  templates: (selectedId?: string | null) =>
    createTemplatesViewState({
      selectedId: selectedId ?? null,
    }),
} as const;
