import { ISubmissionDto, IUpdateSubmissionDto } from '@postybirb/dto';
import {
  ActionEntityType,
  ActionHistory,
  ActionType,
} from '../modules/action-history/action-history';
import Https from '../transports/https';

export default class SubmissionsApi {
  private static readonly request: Https = new Https('submission');

  static getAll() {
    return SubmissionsApi.request.get<ISubmissionDto[]>();
  }

  static update(update: IUpdateSubmissionDto) {
    return SubmissionsApi.request.patch('', update);
  }

  static remove(ids: string[], action: 'UNDO' | 'REDO' | 'DELETE') {
    if (action === 'DELETE') {
      ActionHistory.RecordAction({
        entity: ActionEntityType.ACCOUNT,
        type: ActionType.DELETE,
        ids,
      });
    }
    return SubmissionsApi.request.delete('', { ids, action });
  }
}
