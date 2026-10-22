import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import type { DynamicObject } from '../../models/common/dynamic-object';

export const OAuthWebsiteRequestSchema = z.object({
  id: z.string(),
  data: z.record(z.string(), z.unknown()),
  route: z.string(),
});

export class OAuthWebsiteRequestDto<
  T extends DynamicObject = DynamicObject,
> extends createZodDto(OAuthWebsiteRequestSchema) {
  declare data: T;
}
