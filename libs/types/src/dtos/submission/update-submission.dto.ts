import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { ScheduleType } from '../../enums/schedule-type.enum';
import type { ISubmissionMetadata } from '../../models/submission/submission-metadata.interface';
import { WebsiteFormFieldsSchema } from '../../schemas/website-form-fields.schema';

export const SubmissionMetadataSchema: z.ZodType<ISubmissionMetadata> =
  z.looseObject({
    template: z.object({ name: z.string() }).optional(),
  });

export const SubmissionWebsiteOptionsSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  data: WebsiteFormFieldsSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const UpdateSubmissionSchema = z.object({
  isArchived: z.boolean().optional(),
  isScheduled: z.boolean().optional(),
  scheduledFor: z.iso.datetime({ offset: true, local: true }).optional(),
  scheduleType: z.enum(ScheduleType).optional(),
  cron: z.string().optional(),
  dependsOn: z.array(z.uuidv4()).optional(),
  deletedWebsiteOptions: z.array(z.string()).optional(),
  newOrUpdatedOptions: z.array(SubmissionWebsiteOptionsSchema).optional(),
  metadata: SubmissionMetadataSchema.optional(),
});

export class UpdateSubmissionDto extends createZodDto(UpdateSubmissionSchema) {}
