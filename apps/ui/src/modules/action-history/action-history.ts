/* eslint-disable no-plusplus */
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
  id: string;
};

type ActionHistoryStorage = {
  pointer: number; // Used for tracking undo position
  actions: Action[]; // Action stack
};

type MappedActions = {
  [property in ActionEntityType]: MappedActionTypes;
};

type MappedActionTypes = {
  [property in ActionType]: PossibleActions;
};

type PossibleActions = {
  redo: (id: string) => Promise<FetchResult<unknown>>;
  undo: (id: string) => Promise<FetchResult<unknown>>;
};

const ACTIONS_MAP: MappedActions = {
  SUBMISSION: {
    DELETE: {
      undo: (id: string) => SubmissionsApi.remove(id),
      redo: (id: string) => SubmissionsApi.remove(id),
    },
  },
  ACCOUNT: {
    DELETE: {
      undo: (id: string) => AccountApi.remove(id),
      redo: (id: string) => AccountApi.remove(id),
    },
  },
};

const KEY = 'ActionHistory'; // localStorage accessor

// TODO return expected error for catch and handle
// TODO handle failed actions by removing from array
// TODO fix error returns
// TODO actual usage
export class ActionHistory {
  private static GetActionHistory(): ActionHistoryStorage {
    const value = localStorage.getItem(KEY);
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as ActionHistoryStorage;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }

    return { pointer: -1, actions: [] };
  }

  private static SetActionHistory(history: ActionHistoryStorage): void {
    localStorage.setItem(KEY, JSON.stringify(history));
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

    if (history.pointer !== history.actions.length - 1) {
      // need to insert mid-array
      history.actions.length = history.pointer + 1;
    }

    history.actions.push(action);
    history.pointer = history.actions.length - 1;

    ActionHistory.SetActionHistory(history);
  }

  static Redo(): void {
    const history = ActionHistory.GetActionHistory();
    history.pointer++;
    const redoAction = history.actions[history.pointer];
    if (redoAction) {
      ActionHistory.SetActionHistory(history);
      const executableActions = ActionHistory.GetActionToExecute(redoAction);
      if (executableActions) {
        executableActions
          .redo(redoAction.id)
          .then(console.log)
          .catch(console.error);
      }
    }
  }

  static Undo(): void {
    const history = ActionHistory.GetActionHistory();
    const undoAction = history.actions[history.pointer];
    history.pointer--;
    if (undoAction) {
      ActionHistory.SetActionHistory(history);
      const executableActions = ActionHistory.GetActionToExecute(undoAction);
      if (executableActions) {
        executableActions
          .undo(undoAction.id)
          .then(console.log)
          .catch(console.error);
      }
    }
  }
}

(window as any).ActionHistory = ActionHistory; // For Testing
