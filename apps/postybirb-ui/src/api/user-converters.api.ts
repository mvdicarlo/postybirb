import {
  CreateUserConverterDto,
  UpdateUserConverterDto,
  UserConverterDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class UserConvertersApi extends BaseApi<
  UserConverterDto,
  CreateUserConverterDto,
  UpdateUserConverterDto
> {
  constructor() {
    super('user-converters');
  }
}

export default new UserConvertersApi();
