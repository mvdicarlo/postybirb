import {
  ICreateUserConverterDto,
  IUpdateUserConverterDto,
  UserConverterDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class UserConvertersApi extends BaseApi<
  UserConverterDto,
  ICreateUserConverterDto,
  IUpdateUserConverterDto
> {
  constructor() {
    super('user-converters');
  }
}

export default new UserConvertersApi();
