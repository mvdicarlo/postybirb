import { ICreateTagGroupDto, IUpdateTagGroupDto } from '@postybirb/dto';
import { ITagGroup } from '@postybirb/types';
import Https from '../transports/https';

export default class TagConvertersApi {
  private static readonly request: Https = new Https('tag-converters');

  static create(createTagConvertersDto: ICreateTagGroupDto) {
    return TagConvertersApi.request.post('', createTagConvertersDto);
  }

  static remove(ids: string[]) {
    return TagConvertersApi.request.delete('', {
      ids,
    });
  }

  static getAll() {
    return TagConvertersApi.request.get<ITagGroup[]>();
  }

  static get(id: string, refresh = false) {
    return TagConvertersApi.request.get<ITagGroup>(id, { refresh });
  }

  static update(update: IUpdateTagGroupDto) {
    return TagConvertersApi.request.patch('', update);
  }
}
