import AccountApi from '../../api/account.api';
import SubmissionsApi from '../../api/submission.api';
import { FetchResult } from '../../transports/https';

export enum ActionEntityType {
  SUBMISSION = 'SUBMISSION',
  ACCOUNT = 'ACCOUNT',
}

export enum ActionType {
  DELETE = 'DELETE',
}

export type Action = {
  type: ActionType;
  entity: ActionEntityType;
  ids: string[];
};

type MappedActionList = {
  [property in ActionEntityType]: {
    pointer: number; // Used for tracking undo position
    actions: Action[]; // Action stack
  };
};

type ActionHistoryStorage = MappedActionList;

type MappedActions = {
  [property in ActionEntityType]: MappedActionTypes;
};

type MappedActionTypes = {
  [property in ActionType]: PossibleActions;
};

type PossibleActions = {
  redo: (ids: string[]) => Promise<FetchResult<unknown>>;
  undo: (ids: string[]) => Promise<FetchResult<unknown>>;
};

const ACTIONS_MAP: MappedActions = {
  SUBMISSION: {
    DELETE: {
      undo: (ids: string[]) => SubmissionsApi.remove(ids, 'UNDO'),
      redo: (ids: string[]) => SubmissionsApi.remove(ids, 'REDO'),
    },
  },
  ACCOUNT: {
    DELETE: {
      undo: (ids: string[]) => AccountApi.remove(ids, 'UNDO'),
      redo: (ids: string[]) => AccountApi.remove(ids, 'REDO'),
    },
  },
};

const KEY = 'ActionHistory'; // storage accessor

export class ActionHistory {
  private static GetActionHistory(): ActionHistoryStorage {
    const value = sessionStorage.getItem(KEY);
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as ActionHistoryStorage;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }

    return {
      [ActionEntityType.ACCOUNT]: { actions: [], pointer: -1 },
      [ActionEntityType.SUBMISSION]: { actions: [], pointer: -1 },
    };
  }

  private static SetActionHistory(history: ActionHistoryStorage): void {
    sessionStorage.setItem(KEY, JSON.stringify(history));
  }

  private static GetActionToExecute(
    action: Action
  ): PossibleActions | undefined {
    const { type, entity } = action;

    const entityActions = ACTIONS_MAP[entity];
    if (entityActions) {
      const entityActionType = entityActions[type];
      if (entityActionType) {
        return entityActionType;
      }
    }

    return undefined;
  }

  static RecordAction(action: Action): void {
    const history = ActionHistory.GetActionHistory();

    const entityActions = history[action.entity] || {
      pointer: -1,
      actions: [],
    };

    if (entityActions.pointer !== entityActions.actions.length - 1) {
      // need to insert mid-array
      entityActions.actions.length = entityActions.pointer + 1;
    }

    entityActions.actions.push(action);
    entityActions.pointer = entityActions.actions.length - 1;

    history[action.entity] = entityActions;

    ActionHistory.SetActionHistory(history);
  }

  static Redo(entity: ActionEntityType): void {
    const history = ActionHistory.GetActionHistory();
    const entityActions = history[entity] || {
      pointer: -1,
      actions: [],
    };

    // eslint-disable-next-line no-plusplus
    entityActions.pointer++;
    const redoAction = entityActions.actions[entityActions.pointer];
    if (redoAction) {
      ActionHistory.SetActionHistory(history);
      const executableActions = ActionHistory.GetActionToExecute(redoAction);
      if (executableActions) {
        executableActions.redo(redoAction.ids);
      }
    }
  }

  static Undo(entity: ActionEntityType): void {
    const history = ActionHistory.GetActionHistory();
    const entityActions = history[entity] || {
      pointer: -1,
      actions: [],
    };

    const undoAction = entityActions.actions[entityActions.pointer];
    // eslint-disable-next-line no-plusplus
    entityActions.pointer--;
    if (undoAction) {
      ActionHistory.SetActionHistory(history);
      const executableActions = ActionHistory.GetActionToExecute(undoAction);
      if (executableActions) {
        executableActions.undo(undoAction.ids);
      }
    }
  }

  static hasRedoActions(entity: ActionEntityType): boolean {
    const history = ActionHistory.GetActionHistory();
    const entityActions = history[entity] || {
      pointer: -1,
      actions: [],
    };

    return (
      !!entityActions.actions.length &&
      entityActions.actions.length - 1 > entityActions.pointer
    );
  }

  static hasUndoActions(entity: ActionEntityType): boolean {
    const history = ActionHistory.GetActionHistory();
    const entityActions = history[entity] || {
      pointer: -1,
      actions: [],
    };

    return (
      !!entityActions.actions.length &&
      entityActions.actions.length - 1 <= entityActions.pointer
    );
  }
}

(window as any).ActionHistory = ActionHistory; // For Testing
