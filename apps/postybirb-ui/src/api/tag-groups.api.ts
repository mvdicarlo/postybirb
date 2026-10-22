import {
  CreateTagGroupDto,
  UpdateTagGroupDto,
  TagGroupDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class TagGroupsApi extends BaseApi<
  TagGroupDto,
  CreateTagGroupDto,
  UpdateTagGroupDto
> {
  constructor() {
    super('tag-groups');
  }
}

export default new TagGroupsApi();
