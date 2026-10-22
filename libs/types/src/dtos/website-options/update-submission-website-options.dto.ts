import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { CreateWebsiteOptionsSchema } from './create-website-options.dto';

export const UpdateSubmissionWebsiteOptionsSchema = z.object({
  remove: z.array(z.string()).optional(),
  add: z.array(CreateWebsiteOptionsSchema).optional(),
});

export class UpdateSubmissionWebsiteOptionsDto extends createZodDto(
  UpdateSubmissionWebsiteOptionsSchema,
) {}
