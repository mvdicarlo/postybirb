import { ApiProperty } from '@nestjs/swagger';
import { IQueuePostRecordRequestDto, SubmissionId } from '@postybirb/types';
import { ArrayNotEmpty, IsArray } from 'class-validator';

/** @inheritdoc */
export class QueuePostRecordRequestDto implements IQueuePostRecordRequestDto {
  @ApiProperty()
  @IsArray()
  @ArrayNotEmpty()
  ids: SubmissionId[];
}
