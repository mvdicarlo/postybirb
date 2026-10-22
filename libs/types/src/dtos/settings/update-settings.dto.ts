import { z } from 'zod';
import { createZodDto } from '../zod-dto';

export const SettingsOptionsSchema = z.looseObject({
  hiddenWebsites: z.array(z.string()),
  allowAd: z.boolean(),
  queuePaused: z.boolean(),
  desktopNotifications: z.object({
    enabled: z.boolean(),
    showOnPostSuccess: z.boolean(),
    showOnPostError: z.boolean(),
    showOnDirectoryWatcherError: z.boolean(),
    showOnDirectoryWatcherSuccess: z.boolean(),
  }),
  tagSearchProvider: z
    .object({
      id: z.string().optional(),
      showWikiInHelpOnHover: z.boolean(),
    })
    .transform((provider) => ({ ...provider, id: provider.id })),
  cloudflareChallenge: z
    .object({
      openBrowserWindow: z.boolean(),
    })
    .optional(),
});

export const UpdateSettingsSchema = z.object({
  settings: SettingsOptionsSchema,
});

export class UpdateSettingsDto extends createZodDto(UpdateSettingsSchema) {}
