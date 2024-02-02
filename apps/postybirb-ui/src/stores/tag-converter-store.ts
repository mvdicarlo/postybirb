import { TAG_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { TagConverterDto } from '@postybirb/types';
import tagConvertersApi from '../api/tag-converters.api';
import StoreManager from './store-manager';

export const TagConverterStore: StoreManager<TagConverterDto> =
  new StoreManager<TagConverterDto>(TAG_CONVERTER_UPDATES, () =>
    tagConvertersApi.getAll().then(({ body }) => body)
  );
