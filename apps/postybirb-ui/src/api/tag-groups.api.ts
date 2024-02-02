import {
  ICreateTagGroupDto,
  IUpdateTagGroupDto,
  TagGroupDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class TagGroupsApi extends BaseApi<
  TagGroupDto,
  ICreateTagGroupDto,
  IUpdateTagGroupDto
> {
  constructor() {
    super('tag-groups');
  }
}

export default new TagGroupsApi();
