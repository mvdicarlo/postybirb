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
 */
export type SectionId =
  | 'home'
  | 'file-submissions'
  | 'message-submissions'
  | 'tag-groups'
  | 'tag-converters'
  | 'user-converters';

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
 * Parameters for tag groups view.
 */
export interface TagGroupsParams {
  /** Selected tag group ID */
  selectedId: string | null;
}

/**
 * Parameters for tag converters view.
 */
export interface TagConvertersParams {
  /** Selected tag converter ID */
  selectedId: string | null;
}

/**
 * Parameters for user converters view.
 */
export interface UserConvertersParams {
  /** Selected user converter ID */
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
 * Tag groups view state.
 */
export interface TagGroupsViewState {
  type: 'tag-groups';
  params: TagGroupsParams;
}

/**
 * Tag converters view state.
 */
export interface TagConvertersViewState {
  type: 'tag-converters';
  params: TagConvertersParams;
}

/**
 * User converters view state.
 */
export interface UserConvertersViewState {
  type: 'user-converters';
  params: UserConvertersParams;
}

/**
 * Union type of all possible view states.
 */
export type ViewState =
  | HomeViewState
  | FileSubmissionsViewState
  | MessageSubmissionsViewState
  | TagGroupsViewState
  | TagConvertersViewState
  | UserConvertersViewState;

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
  'file-submissions': { hasPanel: true, defaultWidth: 320 },
  'message-submissions': { hasPanel: true, defaultWidth: 320 },
  'tag-groups': { hasPanel: true, defaultWidth: 280 },
  'tag-converters': { hasPanel: true, defaultWidth: 280 },
  'user-converters': { hasPanel: true, defaultWidth: 280 },
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
 * Create a default tag groups view state.
 */
export function createTagGroupsViewState(
  overrides?: Partial<TagGroupsParams>
): TagGroupsViewState {
  return {
    type: 'tag-groups',
    params: {
      selectedId: null,
      ...overrides,
    },
  };
}

/**
 * Create a default tag converters view state.
 */
export function createTagConvertersViewState(
  overrides?: Partial<TagConvertersParams>
): TagConvertersViewState {
  return {
    type: 'tag-converters',
    params: {
      selectedId: null,
      ...overrides,
    },
  };
}

/**
 * Create a default user converters view state.
 */
export function createUserConvertersViewState(
  overrides?: Partial<UserConvertersParams>
): UserConvertersViewState {
  return {
    type: 'user-converters',
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
 * Check if view state is tag groups.
 */
export function isTagGroupsViewState(
  state: ViewState
): state is TagGroupsViewState {
  return state.type === 'tag-groups';
}

/**
 * Check if view state is tag converters.
 */
export function isTagConvertersViewState(
  state: ViewState
): state is TagConvertersViewState {
  return state.type === 'tag-converters';
}

/**
 * Check if view state is user converters.
 */
export function isUserConvertersViewState(
  state: ViewState
): state is UserConvertersViewState {
  return state.type === 'user-converters';
}

/**
 * Check if view state has a section panel.
 */
export function hasSectionPanel(state: ViewState): boolean {
  return getSectionPanelConfig(state).hasPanel;
}
