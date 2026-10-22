import { z } from 'zod';
import { createZodDto } from '../zod-dto';
import { SubmissionRating } from '../../enums/submission-rating.enum';
import { SubmissionType } from '../../enums/submission-type.enum';
import { DescriptionValueSchema } from '../../schemas/description.schema';
import {
  MultipartBooleanSchema,
  multipartJson,
} from '../../schemas/multipart.schema';

export const CreateSubmissionDefaultOptionsSchema = z.object({
  tags: z.array(z.string()).optional(),
  description: DescriptionValueSchema.optional(),
  rating: z.enum(SubmissionRating).optional(),
});

export type CreateSubmissionDefaultOptions = z.infer<
  typeof CreateSubmissionDefaultOptionsSchema
>;

export const FileMetadataSchema = z.object({
  filename: z.string(),
  title: z.string(),
});

export type FileMetadata = z.infer<typeof FileMetadataSchema>;

export const CreateSubmissionSchema = z
  .object({
    name: z.string().default(''),
    type: z.enum(SubmissionType).optional(),
    isTemplate: MultipartBooleanSchema,
    isMultiSubmission: MultipartBooleanSchema,
    dependsOn: multipartJson(z.array(z.uuidv4())),
    defaultOptions: multipartJson(CreateSubmissionDefaultOptionsSchema),
    fileMetadata: multipartJson(z.array(FileMetadataSchema)),
  })
  .superRefine((value, ctx) => {
    if (value.isTemplate && !value.name.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['name'],
        message: 'A template name is required',
      });
    }
  });

export class CreateSubmissionDto extends createZodDto(CreateSubmissionSchema) {}
