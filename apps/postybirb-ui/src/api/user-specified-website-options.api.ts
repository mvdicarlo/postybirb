import {
  ICreateUserSpecifiedWebsiteOptionsDto,
  IUpdateUserSpecifiedWebsiteOptionsDto,
  TagGroupDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class UserSpecifiedWebsiteOptionsApi extends BaseApi<
  TagGroupDto,
  ICreateUserSpecifiedWebsiteOptionsDto,
  IUpdateUserSpecifiedWebsiteOptionsDto
> {
  constructor() {
    super('user-specified-website-options');
  }
}

export default new UserSpecifiedWebsiteOptionsApi();
