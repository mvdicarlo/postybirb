import { ApiProperty } from '@nestjs/swagger';
import {
    AccountId,
    SubmissionFileId,
    SubmissionId,
} from '@postybirb/types';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class GetIncompleteWorkDto {
  @ApiProperty()
  @IsString()
  submissionId: SubmissionId;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  @IsObject()
  evictions: Record<AccountId, SubmissionFileId[]>;

  @ApiProperty({
    required: false,
    description: 'Only post these accounts/files, including previously successful targets. An empty file list selects all eligible files for that account.',
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
  })
  @IsOptional()
  @IsObject()
  targets?: Record<AccountId, SubmissionFileId[]>;
}