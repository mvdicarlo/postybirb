import { ICreateTagGroupDto, IUpdateTagGroupDto } from '@postybirb/dto';
import { ITagGroup } from '@postybirb/types';
import Https from '../transports/https';

export default class TagGroupsApi {
  private static readonly request: Https = new Https('tag-groups');

  static create(createTagGroupsDto: ICreateTagGroupDto) {
    return TagGroupsApi.request.post('', createTagGroupsDto);
  }

  static remove(ids: string[]) {
    return TagGroupsApi.request.delete('', { ids });
  }

  static getAll() {
    return TagGroupsApi.request.get<ITagGroup[]>();
  }

  static get(id: string, refresh = false) {
    return TagGroupsApi.request.get<ITagGroup>(id, { refresh });
  }

  static update(update: IUpdateTagGroupDto) {
    return TagGroupsApi.request.patch('', update);
  }
}
