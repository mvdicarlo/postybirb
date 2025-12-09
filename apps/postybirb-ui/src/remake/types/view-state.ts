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
  | 'message-submissions';

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
 * Union type of all possible view states.
 */
export type ViewState =
  | HomeViewState
  | AccountsViewState
  | FileSubmissionsViewState
  | MessageSubmissionsViewState;

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
 * Check if view state has a section panel.
 */
export function hasSectionPanel(state: ViewState): boolean {
  return getSectionPanelConfig(state).hasPanel;
}
