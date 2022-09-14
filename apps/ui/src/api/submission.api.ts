import { ISubmissionDto } from '@postybirb/dto';
import Https from '../transports/https';

export default class SubmissionsApi {
  private static readonly request: Https = new Https('submission');

  static getAll() {
    return SubmissionsApi.request.get<ISubmissionDto[]>();
  }
}
