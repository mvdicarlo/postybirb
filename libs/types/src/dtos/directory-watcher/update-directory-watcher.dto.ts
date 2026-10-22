import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { CreateDirectoryWatcherSchema } from './create-directory-watcher.dto';

export const UpdateDirectoryWatcherSchema =
  CreateDirectoryWatcherSchema.partial().extend({
    templateId: z.string().nullish(),
  });

export class UpdateDirectoryWatcherDto extends createZodDto(
  UpdateDirectoryWatcherSchema,
) {}
