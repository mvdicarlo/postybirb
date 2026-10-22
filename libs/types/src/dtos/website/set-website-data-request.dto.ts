import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import type { DynamicObject } from '../../models/common/dynamic-object';

export const SetWebsiteDataRequestSchema = z.object({
  id: z.string(),
  data: z.record(z.string(), z.unknown()),
});

export class SetWebsiteDataRequestDto<
  T extends DynamicObject = DynamicObject,
> extends createZodDto(SetWebsiteDataRequestSchema) {
  declare data: T;
}
