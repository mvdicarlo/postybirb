import { ApiProperty } from '@nestjs/swagger';
import { IPostQueueActionDto } from '@postybirb/types';
import { ArrayNotEmpty, IsArray } from 'class-validator';

export class PostQueueActionDto implements IPostQueueActionDto {
  @ApiProperty()
  @IsArray()
  @ArrayNotEmpty()
  submissionIds: string[];
}
