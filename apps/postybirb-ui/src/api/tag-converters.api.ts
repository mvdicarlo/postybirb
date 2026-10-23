import {
  CreateTagConverterDto,
  UpdateTagConverterDto,
  TagConverterDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class TagConvertersApi extends BaseApi<
  TagConverterDto,
  CreateTagConverterDto,
  UpdateTagConverterDto
> {
  constructor() {
    super('tag-converters');
  }
}

export default new TagConvertersApi();
