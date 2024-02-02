import {
  ICreateTagConverterDto,
  IUpdateTagConverterDto,
  TagConverterDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class TagConvertersApi extends BaseApi<
  TagConverterDto,
  ICreateTagConverterDto,
  IUpdateTagConverterDto
> {
  constructor() {
    super('tag-converters');
  }
}

export default new TagConvertersApi();
