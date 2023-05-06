import { ICreateTagGroupDto, IUpdateTagGroupDto } from '@postybirb/dto';
import { ITagGroupDto } from '@postybirb/types';
import Https from '../transports/https';

export default class TagGroupsApi {
  private static readonly request: Https = new Https('tag-groups');

  static create(createTagGroupsDto: ICreateTagGroupDto) {
    return TagGroupsApi.request.post('', createTagGroupsDto);
  }

  static remove(ids: string[]) {
    return TagGroupsApi.request.delete('', {
      ids,
    });
  }

  static getAll() {
    return TagGroupsApi.request.get<ITagGroupDto[]>();
  }

  static get(id: string, refresh = false) {
    return TagGroupsApi.request.get<ITagGroupDto>(id, { refresh });
  }

  static update(id: string, update: IUpdateTagGroupDto) {
    return TagGroupsApi.request.patch(id, update);
  }
}
