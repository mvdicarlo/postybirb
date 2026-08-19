import { ApiProperty } from '@nestjs/swagger';
import {
    AccountId,
    SubmissionFileId,
    SubmissionId,
} from '@postybirb/types';
import { IsObject, IsString } from 'class-validator';

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
}