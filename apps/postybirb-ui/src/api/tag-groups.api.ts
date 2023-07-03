import {
  ICreateTagConverterDto,
  IUpdateTagConverterDto,
  TagGroupDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class TagGroupsApi extends BaseApi<
  TagGroupDto,
  ICreateTagConverterDto,
  IUpdateTagConverterDto
> {
  constructor() {
    super('tag-groups');
  }
}

export default new TagGroupsApi();
