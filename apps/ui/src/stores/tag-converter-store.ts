import { TAG_CONVERTER_UPDATES } from '@postybirb/socket-events';
import { ITagConverter } from '@postybirb/types';
import TagConvertersApi from '../api/tag-converters.api';
import StoreManager from './store-manager';

export const TagConverterStore: StoreManager<ITagConverter> =
  new StoreManager<ITagConverter>(TAG_CONVERTER_UPDATES, () =>
    TagConvertersApi.getAll().then(({ body }) => body)
  );
