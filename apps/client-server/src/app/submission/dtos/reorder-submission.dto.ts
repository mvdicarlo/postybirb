import { ApiProperty } from '@nestjs/swagger';
import { SubmissionId } from '@postybirb/types';
import { IsIn, IsString } from 'class-validator';

export class ReorderSubmissionDto {
  @ApiProperty({ description: 'The ID of the submission to move' })
  @IsString()
  id: SubmissionId;

  @ApiProperty({
    description: 'The ID of the target submission to position relative to',
  })
  @IsString()
  targetId: SubmissionId;

  @ApiProperty({
    description: 'Whether to place before or after the target',
    enum: ['before', 'after'],
  })
  @IsIn(['before', 'after'])
  position: 'before' | 'after';
}
