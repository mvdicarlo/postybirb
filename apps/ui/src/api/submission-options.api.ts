import { IUpdateSubmissionOptionsDto } from '@postybirb/dto';
import { BaseWebsiteOptions } from '@postybirb/types';
import Https from '../transports/https';

export default class SubmissionOptionsApi {
  private static readonly request: Https = new Https('submission-option');

  static update<T extends BaseWebsiteOptions>(
    options: IUpdateSubmissionOptionsDto<T>
  ) {
    return SubmissionOptionsApi.request.patch('', options);
  }
}
