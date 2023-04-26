import { TAG_GROUP_UPDATES } from '@postybirb/socket-events';
import { ITagGroup } from '@postybirb/types';
import TagGroupsApi from '../api/tag-groups.api';
import StoreManager from './store-manager';

export const TagGroupStore: StoreManager<ITagGroup> =
  new StoreManager<ITagGroup>(TAG_GROUP_UPDATES, () =>
    TagGroupsApi.getAll().then(({ body }) => body)
  );
