import { ApiProperty } from '@nestjs/swagger';
import { IPostQueueActionDto, PostRecordResumeMode } from '@postybirb/types';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional } from 'class-validator';

export class PostQueueActionDto implements IPostQueueActionDto {
  @ApiProperty()
  @IsArray()
  @ArrayNotEmpty()
  submissionIds: string[];

  @ApiProperty({ enum: PostRecordResumeMode, required: false })
  @IsOptional()
  @IsEnum(PostRecordResumeMode)
  resumeMode?: PostRecordResumeMode;
}
