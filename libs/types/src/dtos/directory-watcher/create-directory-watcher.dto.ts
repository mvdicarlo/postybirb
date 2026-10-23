import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { DirectoryWatcherImportAction } from '../../enums/directory-watcher-import-action.enum';

export const CreateDirectoryWatcherSchema = z.object({
  importAction: z.enum(DirectoryWatcherImportAction),
  path: z.string().optional(),
});

export class CreateDirectoryWatcherDto extends createZodDto(
  CreateDirectoryWatcherSchema,
) {}
