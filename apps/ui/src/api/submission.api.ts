import { ISubmissionDto, IUpdateSubmissionDto } from '@postybirb/dto';
import Https from '../transports/https';

export default class SubmissionsApi {
  private static readonly request: Https = new Https('submission');

  static getAll() {
    return SubmissionsApi.request.get<ISubmissionDto[]>();
  }

  static update(id: string, update: IUpdateSubmissionDto) {
    return SubmissionsApi.request.patch(id, update);
  }

  static remove(id: string) {
    return SubmissionsApi.request.delete(id);
  }
}
