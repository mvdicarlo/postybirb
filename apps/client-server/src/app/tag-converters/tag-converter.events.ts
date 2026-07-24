import { TagConverterDto } from '@postybirb/types';
import { EntityDeltaEvent } from '../common/events/entity-crud.events';

export const TAG_CONVERTER_EVENT_PREFIX = 'tag-converter';

export type TagConverterEventTypes = EntityDeltaEvent<TagConverterDto>;
