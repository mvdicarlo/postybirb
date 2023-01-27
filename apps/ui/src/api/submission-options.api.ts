import {
  IUpdateSubmissionOptionsDto,
  IValidateSubmissionOptionsDto,
} from '@postybirb/dto';
import { IBaseWebsiteOptions, ValidationResult } from '@postybirb/types';
import Https from '../transports/https';

export default class SubmissionOptionsApi {
  private static readonly request: Https = new Https('submission-option');

  static update<T extends IBaseWebsiteOptions>(
    options: IUpdateSubmissionOptionsDto<T>
  ) {
    return SubmissionOptionsApi.request.patch('', options);
  }

  static validate(id: string, dto: IValidateSubmissionOptionsDto) {
    return SubmissionOptionsApi.request
      .post<ValidationResult, IValidateSubmissionOptionsDto>('validate', dto)
      .then((res) => ({ id, result: res.body }));
  }
}
