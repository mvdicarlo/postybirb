import { TAG_GROUP_UPDATES } from '@postybirb/socket-events';
import { TagGroupDto } from '@postybirb/types';
import tagGroupsApi from '../api/tag-groups.api';
import StoreManager from './store-manager';

export const TagGroupStore: StoreManager<TagGroupDto> =
  new StoreManager<TagGroupDto>(TAG_GROUP_UPDATES, () =>
    tagGroupsApi.getAll().then(({ body }) => body),
  );
