import { ISubmissionDto, IUpdateSubmissionDto } from '@postybirb/dto';
import { SubmissionType } from '@postybirb/types';
import {
  ActionEntityType,
  ActionHistory,
  ActionType,
  HistoryAction,
} from '../modules/action-history/action-history';
import Https from '../transports/https';

export default class SubmissionsApi {
  private static readonly request: Https = new Https('submission');

  static get(id: string) {
    return SubmissionsApi.request.get<ISubmissionDto>(id);
  }

  static getAll() {
    return SubmissionsApi.request.get<ISubmissionDto[]>();
  }

  static createMessageSubmission(name: string) {
    SubmissionsApi.request.post('', {
      name,
      type: SubmissionType.MESSAGE,
    });
  }

  static update(update: IUpdateSubmissionDto) {
    return SubmissionsApi.request.patch('', update);
  }

  static remove(ids: string[], action: HistoryAction = HistoryAction.DELETE) {
    if (action === HistoryAction.DELETE) {
      ActionHistory.RecordAction({
        entity: ActionEntityType.SUBMISSION,
        type: ActionType.DELETE,
        ids,
      });
    }
    return SubmissionsApi.request.delete('', { ids, action });
  }
}
