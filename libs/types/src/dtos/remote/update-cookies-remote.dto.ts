import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const UpdateCookiesRemoteSchema = z.object({
  accountId: z.string(),
  cookies: z.string(),
  localStorage: z
    .object({
      url: z.string(),
      data: z.record(z.string(), z.unknown()),
    })
    .optional(),
});

export class UpdateCookiesRemoteDto extends createZodDto(
  UpdateCookiesRemoteSchema,
) {}
