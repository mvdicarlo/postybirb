import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const CustomWebsiteRouteSchema = z.object({
  id: z.string(),
  route: z.string(),
  data: z.unknown(),
});

export class CustomWebsiteRouteDto extends createZodDto(
  CustomWebsiteRouteSchema,
) {}
